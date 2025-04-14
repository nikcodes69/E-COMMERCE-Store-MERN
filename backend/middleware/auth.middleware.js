import User from "../models/user.model.js";
import jwt, { decode } from "jsonwebtoken";
import mongoose from "mongoose";

export const protectRoute = async (req, res, next) => {
    try {
      const accessToken = req.cookies.accessToken;
      if (!accessToken) {
        return res.status(401).json({ message: 'Unauthorized: No access token provided' });
      }
  
      const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
      console.log('Decoded token payload:', decoded);
      
      const userId = new mongoose.Types.ObjectId(decoded.userId);
      console.log('Converted ObjectId:', userId);
      const user = await User.findById(userId).select('-password');
      console.log('User lookup result:', user);

      if (!user) {
        return res.status(401).json({ message: 'Unauthorized: User not found' });
      }
      
      req.user = user;
      next();
    } catch (error) {
      console.log('Error in protectRoute middleware:', error.message);
      
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Unauthorized: Access token expired' });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
      }
      
      return res.status(500).json({ message: 'Server error' });
    }
  };

export const adminRoute = async(req,res,next)=>{
    if(req.user && req.user.role === 'admin'){
        next();
    }
    
    else{
        return res.status(403).json({message: 'Forbidden : Only admins can access this route'});
    }
}