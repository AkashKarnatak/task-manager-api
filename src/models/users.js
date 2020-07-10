const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Task = require('./tasks');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    }, 
    email: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error('Not a valid email!');
            }
        }
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: 7,
        validate(value){
            if (value.toLowerCase().includes('password')){
                throw new Error('Password is too common');
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value){
            if(value < 0){
                throw new Error('Not a valid age!');
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true,
        }
    }],
    avatar: {
        type: Buffer
    }
}, {
    timestamps: true
});

userSchema.virtual('tasks', {
    ref: 'Task',
    localField: '_id',
    foreignField: 'author'
});

userSchema.methods.toJSON = function() {
    const userObject = this.toObject();
    
    delete userObject.password;
    delete userObject.tokens;
    delete userObject.avatar;

    return userObject;
}

userSchema.methods.generateAuthToken = async function() {
    const token = jwt.sign({_id: this.id.toString()}, process.env.JWT_SECRET);
    this.tokens.push({token});
    await this.save();
    return token;
}

userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({email});
    if(!user){
        throw new Error('Unable to login');
    }
    const notMatched = !await bcrypt.compare(password, user.password);
    if(notMatched){
        throw new Error('Unable to login');
    }
    return user;
}

userSchema.pre('save', async function(next) {
    try{
        if(this.isModified('password')){
            this.password = await bcrypt.hash(this.password, 8);
        }
    } catch(e) {
        console.log('Could not hash password');
    }
    next();
});

userSchema.pre('remove', async function(next) {
    await Task.deleteMany({author: this._id});
    next();
});

const User = new mongoose.model('User', userSchema);

module.exports = User;