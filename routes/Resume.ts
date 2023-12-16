import express, { Router } from 'express';
import { resumeFinder, uploadResume } from '../controllers/ResumeControllers';
const router:Router=express.Router();

router.route("/resumes").post(resumeFinder)
router.route('/upload').post(uploadResume);


export default router;