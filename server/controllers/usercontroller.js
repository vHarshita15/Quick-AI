import sql from "../configs/db.js";

export const getUserCreations = async (req, res) => {
    try {
        const userId = req.auth()?.userId;

        const creations = await sql`SELECT * FROM creations WHERE user_id = ${userId} ORDER BY created_at DESC`;
        res.json({ success: true, creations });
    }
    catch(error){
        res.json({ success: false, message: error.message });
    }
}

export const getPublishedCreations = async (req, res) => {
    try {
        const creations = await sql`SELECT * FROM creations WHERE is_published = true ORDER BY created_at DESC`;
        res.json({ success: true, creations });
    }
    catch(error){
        res.json({ success: false, message: error.message });
    }
}

export const toggleLikeCreation = async (req, res) => {
    try {
        const userId = req.auth()?.userId;
        const { id } = req.body;

        const [creation] = await sql`SELECT * FROM creations WHERE id = ${id}`;

        if(!creation){
            return res.json({ success: false, message: "Creation not found" });
        }

        const currentLikes = creation.currentlikes;
        const userIdStr = userId.toString();
        let updatedLikes;
        let message;

        if(currentLikes.includes(userIdStr)){
            updatedLikes = currentLikes.filter((user) => user !== userIdStr);
            message = 'Creation UnLiked';
        }
        else{
            updatedLikes = [...currentLikes, userIdStr];
            message = 'Creation Liked';
        }

        const formattedArray = `{${updatedLikes.join(',')}}`;

        await sql`UPDATE creations SET currentlikes = ${formattedArray}::text[] WHERE id = ${id}`;

        res.json({ success: true, message });
    }
    catch(error){
        res.json({ success: false, message: error.message });
    }
}