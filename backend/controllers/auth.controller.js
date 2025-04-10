import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = ({ userId }) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m'
    })

    const refreshToken = jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: '7d'
    })

    return { accessToken, refreshToken }
}

const storeRefreshToken = async (userId, refreshToken) => {
    console.log(`Storing token for user ${userId}`);
    try {
        await redis.set(`refresh_token:${userId}`, refreshToken,"EX", 7*24*60*60);
        console.log('Token stored successfully');
    } catch (error) {
        console.error('Redis error:', error);
        throw error;
    }
}

const setCookies = (res,accessToken,refreshToken)=>{
    res.cookie('accessToken', accessToken, {
        httpOnly: true, //prevents XSS attack, cross site scripting attacks
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', //prevents CSRF attack, cross site request forgery
        maxAge: 15*60*1000 //15mins
    })
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true, //prevents XSS attack, cross site scripting attacks
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict', //prevents CSRF attack, cross site request forgery
        maxAge: 7*24*60*60*1000 //7 days
    })
}

export const signup = async (req,res)=>{

    const {name,email,password} = req.body;

    try{
    const userExists = await User.findOne({email});

    if(userExists){
        return res.status(400).json({messsage: 'User already exists'});
    }

    else{
        const user = await User.create({name,email,password});  

        //Authentication
        const {accessToken, refreshToken} = generateTokens({userId: user._id});
        await storeRefreshToken(user._id,refreshToken);

        setCookies(res,accessToken,refreshToken);

        res.status(201).json({user:{
            _id: user._id,
            name: user.name,
            email: user.email,
        },message: 'User Created Successfully'});
    }
    }

    catch(error){
        console.log('noo');
        
        res.status(500).json({message: error.message});
    }
}

export const login = async (req,res)=>{
    res.send('Login route called');
}

export const logout = async (req,res)=>{
    res.send('Logout route called');
}

