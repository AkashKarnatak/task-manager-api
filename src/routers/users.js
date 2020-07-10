const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const router = new express.Router();
const User = require('../models/users');
const auth = require('../middlewares/auth');

const upload = multer({
    limits: {
        fileSize: 1000000
    }, 
    fileFilter(req, file, cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error('Supported file formats are jpg, jpeg and png'));
        }
        cb(undefined, true);
    }
});

router.post('/users', async (req, res) => {
    const user = new User(req.body);
    try {
        await user.save();
        const token = await user.generateAuthToken();
        res.status(201).send({user, token});
    } catch (e) {
        res.status(400).send(e);
    }
});

router.post('/users/login', async (req, res) => {
    try {
        const user = await User.findByCredentials(req.body.email, req.body.password);
        const token = await user.generateAuthToken();
        res.send({user, token});
    } catch(e) {
        res.sendStatus(400);
    }
});

router.get('/users/me', auth, async (req, res) => {
    res.send(req.user);
});

router.post('/users/logout', auth, async (req, res) => {
    try {
        req.user.tokens = req.user.tokens.filter((token) => token.token !== req.token);
        await req.user.save();

        res.sendStatus(200);
    } catch(e) {
        res.sendStatus(500);
    }
});

router.post('/users/logoutAll', auth, async (req, res) => {
    try {
        req.user.tokens = [];
        await req.user.save();
        
        res.sendStatus(200);
    } catch(e) {
        res.sendStatus(500);
    }
});

router.patch('/users/me', auth, async (req, res) => {
    const requestedUpdates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'password', 'age'];
    const isNotValidUpdate = !requestedUpdates.every((value) => allowedUpdates.includes(value));
    
    if(isNotValidUpdate){
        return res.status(400).send({"error": "Invalid update key"});
    }
    try {
        requestedUpdates.forEach((key) => req.user[key] = req.body[key]);
        await req.user.save();
        res.send(req.user);
    } catch(e) {
        res.status(400).send(e);
    }
});

router.delete('/users/me', auth, async (req, res) => {
    try {
        await req.user.remove();
        res.send(req.user);
    } catch(e) {
        res.sendStatus(500);
    }
});

router.post('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    const buffer = await sharp(req.file.buffer).resize({ width: 250, height: 250 }).png().toBuffer();
    req.user.avatar = buffer;
    await req.user.save();
    res.sendStatus(200);
}, (error, req, res, next) => {
    res.status(400).send({error: error.message});
});

router.delete('/users/me/avatar', auth, upload.single('avatar'), async (req, res) => {
    req.user.avatar = undefined;
    await req.user.save();
    res.sendStatus(200);
});

router.get('/users/:id/avatar', async (req, res) => {
    const user = await User.findById(req.params.id);

    try {
        if(!user || !user.avatar) { 
            throw new Error();
        }
        res.set('Content-Type', 'image/png');
        res.send(user.avatar);    
    } catch(e) {
        res.status(404).send();
    }
    
});

module.exports = router;