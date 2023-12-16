const express = require('express');
const { resumeFinder, uploadResume } = require('../controllers/ResumeControllers');
const router=express.Router();

router.route("/resumes").post(resumeFinder)
router.route('/upload').post(uploadResume);


module.exports= router;