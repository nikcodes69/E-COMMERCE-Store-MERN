import Product from "../models/product.model.js";
import { redis } from "../lib/redis.js";
import cloudinary from "../lib/cloudinary.js";

export const getAllProducts = async(req,res)=>{

    try{
        const products = await Product.find({}); // FIND ALL PRODUCTS
        res.json({products});
    }
    catch(error){
        console.log('Error in getAllProducts controller', error.message);
        res.status(500).json({message: 'Server error', error: error.message})
    }
}

export const getFeaturedProducts = async(req,res)=>{
    try{
        let featuredProducts = await redis.get('Featured Products');
        if(featuredProducts){
            return res.json(JSON.parse(featuredProducts));
        }

        //if not in redis, fetch from mongodb
        //.lean() is gonna return a plain js object instead of a mongoose object which is good for performance

        featuredProducts = await Product.find({isFeatured:true}).lean();

        if(!featuredProducts){
            return res.status(404).json({message: 'No featured products found'})
        }

        await redis.set('Featured Products', JSON.stringify(featuredProducts));
        res.json(featuredProducts);
    }
    catch(error){
        console.log('Error in getFeaturedProducts controller',error.message);
        res.status(500).json({message: 'Server Error', error: error.message});
    }
}

export const createProduct = async(req,res)=>{
    try{
        const {name,description,price,image,category} = req.body;
        let cloudinaryResponse = null;

        if(image){
            cloudinaryResponse = await cloudinary.uploader.upload(image, {folder:'products'});
        }
        
        const product = await Product.create({
            name,
            description,
            price,
            image: cloudinaryResponse ? cloudinaryResponse.secure_url : '',
            category
        })
        res.status(201).json(product);
        console.log('Product created');
        
    }
    catch(error){
        console.log('Error in createProduct Controller',error.message);
        res.status(500).json({message: 'Server error',error: error.message});
    }
}

export const deleteProduct = async (req,res)=>{

    try{
        const product = await Product.findById(req.params.id);

        if(!product){
            return res.status(404).json({message: 'Product not found'})
        }

        if(product.image){
            const publicId = product.image.split('/').pop().split('.')[0];
            try{
                await cloudinary.uploader.destroy(`products/${publicId})`);
                console.log('DEleted image from cloudinary');
            }
            catch(error){
                console.log('Error deleting image from cloudinary',error.message);
            }
        }
        await Product.findByIdAndDelete(req.params.id);

        res.json({message: 'Product deleted succesfully'});

    }
    catch(error){
        console.log('Error in deleteProduct Controller',error.message);
        res.status(500).json({message:'Server Error', error: error.message})

    }
}

export const getRecommendedProducts= async (req,res)=>{
    try{
        const products = await Product.aggregate([
            {
                $sample: {size:3}
            },
            {
                $project:{
                    _id:1,
                    name:1,
                    price:1,
                    image:1,
                    description:1
                }
            }
        ])
        res.json(products);
    }
    catch(error){
        console.log('Error in getRecommendedProducts Controller',error.message);
        res.status(500).json({message:'Server Error', error: error.message})
    }

}

export const getProductsByCategory= async (req,res) => {

    const {category} = req.params;

    try{
        const products = await Product.find({category});
        res.json(products);
    }
    catch(error){
        console.log('Error in getProductsByCategory Controller',error.message);
    }
}

export const toggleFeaturedProduct = async (req,res) => {
    try{
        const product = await Product.findById(req.params.id);
        if(product){
            product.isFeatured = !product.isFeatured;
            const updatedProduct = await product.save();

            await updatedFeaturedProductsCache();
            res.json(updatedProduct);
        }

        else{
            res.status(404).json({message:'Product Not Found'})
        }
    }
    catch(error){
        console.log('Error in toggleFeaturedProduct Controller',error.message);
        res.status(500).json({message: 'Server Error', error: error.message})
    }
    
}

async function updatedFeaturedProductsCache(){
    try{
        const featuredProducts = await Product.find({isFeatured: true}).lean();
        await redis.set("featured_products",JSON.stringify(featuredProducts));
    }
    catch(error){
        console.log('Error in update cache function');
    }
}