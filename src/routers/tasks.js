const express = require('express');
const router = new express.Router();
const Task = require('../models/tasks');
const auth = require('../middlewares/auth');

router.post('/tasks', auth, async (req, res) => {
    const task = new Task({
        ...req.body,
        author: req.user._id
    });

    try {
        await task.save();
        res.status(201).send(task);
    } catch(e) {
        res.status(400).send(e);
    }
});

router.get('/tasks', auth, async (req, res) => {
    const match = {};
    const sort = {};
    if(req.query.completed){
        match.completed = req.query.completed === 'true';
    }
    if(req.query.sortBy){
        const s = req.query.sortBy.split(':');
        sort[s[0]] = s[1] === 'desc' ? -1 : 1;
    }
    try {
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate();
        res.send(req.user.tasks);
    } catch(e) {
        res.sendStatus(500);
    }
});

router.get('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({_id: req.params.id, author: req.user._id});
        if(!task) {
            return res.sendStatus(404);
        }
        res.send(task);
    } catch(e) {
        res.sendStatus(500)
    }
});

router.patch('/tasks/:id', auth, async (req, res) => {
    const requestedUpdates = Object.keys(req.body);
    const allowedUpdates = ['description', 'completed'];
    const isNotValidUpdate = !requestedUpdates.every((value) => allowedUpdates.includes(value));

    if(isNotValidUpdate){
        return res.status(400).send({error: "Invalid update key"});
    }
    try{
        const task = await Task.findOne({_id: req.params.id, author: req.user._id});
        if(!task){
            return res.sendStatus(404);
        }
        requestedUpdates.forEach((key) => task[key] = req.body[key]);
        await task.save();
        res.send(task);
    } catch(e) {
        console.log(e)
        res.status(400).send(e);
    }
});

router.delete('/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({_id: req.params.id, author: req.user._id});

        if(!task){
            return res.sendStatus(404);
        }
        res.send(task);
    } catch(e) {
        res.sendStatus(500);
    }
});

module.exports = router;