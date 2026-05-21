import express from "express";
import multer from "multer";
import { upload as baseUpload } from "../configs/multer.js";

import {
    generateArticle,
    generateBlogTitles,
    generateImage,
    removeImageObject,
    removeImageBackground,
    resumeReview
} from "../controllers/aiController.js";
const upload = multer({ storage: multer.diskStorage({}) });

const aiRouter = express.Router();


aiRouter.post("/generate-article", generateArticle);
aiRouter.post("/generate-blog-title", generateBlogTitles);
aiRouter.post("/generate-image", generateImage);
aiRouter.post("/remove-image-object", upload.single("image"), removeImageObject);
aiRouter.post("/remove-image-background", upload.single("image"), removeImageBackground);
aiRouter.post("/resume-review", upload.single("resume"), resumeReview);

export default aiRouter;