export const auth = async (req, res, next) => {
    try {
        req.userId = "guest";
        req.free_usage = 0;
        req.plan = "free";

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};