
import { clerkClient, getAuth } from "@clerk/express";

export const auth = async (req, res, next) => {
    try {
        const { userId, has } = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const hasPremiumPlan = has({ plan: "premium" });
        const user = await clerkClient.users.getUser(userId);

req.userId = userId;
        req.free_usage = user.privateMetadata?.free_usage || 0;
        req.plan = hasPremiumPlan ? "premium" : "free";


        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};