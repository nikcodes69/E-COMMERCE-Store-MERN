import { redis } from "../lib/redis.js";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

const generateTokens = ({ userId }) => {
    const accessToken = jwt.sign({ userId }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '15m'
    })
    console.log("Token payload should contain:", { userId });

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
            role: user.role,
            email: user.email
        },message: 'User Created Successfully'});
    }
    }

    catch(error){
        console.log('Error in login controller',error.message);
        res.status(500).json({message: error.message});
    }
}

export const login = async (req,res)=>{ 
    try{
        const {email,password} = req.body;
        const user = await User.findOne({email});

        if(user && (await user.comparePassword(password))){
            const {accessToken,refreshToken} = generateTokens({ userId: user._id });
             
            await storeRefreshToken(user._id,refreshToken)
            setCookies(res,accessToken, refreshToken)

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            });
        }   
        else{
            res.status(401).json({message: 'Invalid email or password'});
        }
    }

    catch(error){
        console.log('Error in login controller',error.message);
        res.status(500).json({message: error.message})
    }
}

export const logout = async (req,res)=>{
    try {
        const refreshToken = req.cookies.refreshToken;
        if(refreshToken){
            const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET);
            await redis.del(`refresh_token:${decoded.userId}`)
        }
        res.clearCookie('accesToken');
        res.clearCookie('refreshToken');
        res.json({message: 'Logged out successfully'});
    }
        
    catch (error) {
        res.status(500).json({message: 'Server error',error: error.message});
    }
}

export const refreshToken = async(req,res)=>{
    try{
        const refreshToken = req.cookies.refreshToken;
        console.log(refreshToken);

        if(!refreshToken){
            return res.status(401).json({message:'NO refresh token provided'});
        }

        const decoded = jwt.verify(refreshToken,process.env.REFRESH_TOKEN_SECRET);
        const storedToken = await redis.get(`refresh_token:${decoded.userId}`)

        if(storedToken !== refreshToken){
            return res.status(401).json({message: 'INvalid refresh token'});
        }

        const accessToken = jwt.sign({userId: decoded.userId},process.env.ACCESS_TOKEN_SECRET,{expiresIn: '15m'});

        res.cookie('accessToken', accessToken, {
            httpOnly: true, //prevents XSS attack, cross site scripting attacks
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', //prevents CSRF attack, cross site request forgery
            maxAge: 15*60*1000 //15mins
        })

        res.json({message: 'Token Refreshed Successfully'});
    }
    catch(error){
        console.log('Error in refreshToken controller',error.message);
    }
}

 