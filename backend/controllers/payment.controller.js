export const createCheckoutSession = async(req,res)=>{

    try{
        const {products,couponCode} = req.body;

        if(!Array.isArray(products) || products.length ===0){
            return res.status(400).json({error: 'Invalid or empty products array'});
        }

        let totalAmount = 0;

        const lineItems = products.map((product=>{
            const amount = Math.round(product.price * 100) // stripe wants u to send in the format of cents
            totalAmount += amount * product.quantity;

            return {
                price: amount,
                quantity: product.quantity,
                name: product.name,
            };
        })) 
    }

    catch(error){

    }

}