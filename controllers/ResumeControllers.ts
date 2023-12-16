import { NextFunction, Response, Request } from "express";
import path from 'path'
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import fs from 'fs'
import { OpenAI } from 'openai'
import natural from 'natural'

const TfIdf = natural.TfIdf;
const PorterStemmer = natural.PorterStemmer;

const posiion_tfidf = new TfIdf();
const skill_tfidf = new TfIdf();
const education_tfidf = new TfIdf();

interface GetResume {
    jobDescription?: string
}

interface Job {
    file?: string
    job_position: string
    skills: string
    work_experience: string
    education: any
}

interface Filter {
    file: string | undefined
    score: number
    job_score: number
    skill_score: number
    experience_score: number
    education_score: number
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

async function extractInformation(type: string, resumeText: string) {
    try {
        const gptResponse = await openai.completions.create({
            prompt: `Extract job position (Field:job_position), skills (Field: skills), years of work experience (Field: work_experience), education (Field: education) from the following ${type} and show result in json format and use those fields name as key and type of value will be string:\n\n${resumeText}\n\n`,
            model: "gpt-3.5-turbo-instruct",
            max_tokens: 1000,
            temperature: 0
        });

        // Extract relevant information from GPT response
        const extractedInformation = JSON.parse(gptResponse.choices[0].text);
       
        return extractedInformation;
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

async function extractTextFromPDF(pdfPath: string) {
    try {
        const loader = new PDFLoader(pdfPath, {
            splitPages: false,
            parsedItemSeparator: " ",
          });

        const docs = await loader.load();

        
        return extractInformation("resume", docs.map(doc=>doc.pageContent).join("\n"));



    } catch (error) {
        console.error(`Error reading PDF at ${pdfPath}:`, error);
        return null;
    }
}

// Function to process all PDFs in a directory
async function processPDFsInDirectory(directoryPath: string) {
    try {
        const files = await fs.promises.readdir(directoryPath);
        const result:any = [];
        for (const file of files) {
            const filePath = path.join(directoryPath, file);

            // Check if the file is a PDF
            if (path.extname(file).toLowerCase() === '.pdf') {
                const pdfText = await extractTextFromPDF(filePath);

                if (pdfText) {
                    result.push({ file: filePath, ...pdfText });
                }
            }
        }

        return result
    } catch (error) {
        console.error('Error reading directory:', error);
    }
}

function preprocessAndStem(document: string) {
    return document.toLowerCase().split(/\s+/).map(PorterStemmer.stem);
}





function parseExperience(experience: string) {
    const match = experience.toString().match(/(\d+) years/);
    return match ? parseInt(match[1], 10) : 0;
}


function calculateExperienceScore(job: string, resume: string) {
    const j: number = parseExperience(job)
    const r: number = parseExperience(resume)

    if (r && j) {
        if (r >= j) return 1
        else return 0
    }
    else {
        return 0
    }
}


function calculateJaccardSimilarity(set1: any, set2: any) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}




const filterResume = (jobdescription: Job, resumes: Job[] | undefined) => {

    const filteredResumes: Filter[] = []

    posiion_tfidf.addDocument(preprocessAndStem(jobdescription.job_position))
    skill_tfidf.addDocument(preprocessAndStem(jobdescription.skills))
    education_tfidf.addDocument(preprocessAndStem(jobdescription.education))

    resumes?.forEach(resume => {
        posiion_tfidf.addDocument(preprocessAndStem(resume.job_position))
        skill_tfidf.addDocument(preprocessAndStem(resume.skills))
        education_tfidf.addDocument(preprocessAndStem(resume.education))
    })

    const tfidfForJobposition = posiion_tfidf.tfidfs(preprocessAndStem(jobdescription.job_position));
    const tfidfForJobskill = skill_tfidf.tfidfs(preprocessAndStem(jobdescription.skills));
    const tfidfForJobeducation = education_tfidf.tfidfs(preprocessAndStem(jobdescription.education));



    resumes?.forEach(resume => {
        const positionTFIDF = posiion_tfidf.tfidfs(preprocessAndStem(resume.job_position))
        const skillsTFIDF = skill_tfidf.tfidfs(preprocessAndStem(resume.skills))
        const experience_score = calculateExperienceScore(jobdescription.work_experience, resume.work_experience)
        const educationTFIDF = education_tfidf.tfidfs(preprocessAndStem(resume.education))

        const position_score = calculateJaccardSimilarity(new Set(tfidfForJobposition), new Set(positionTFIDF));
        const skill_score = calculateJaccardSimilarity(new Set(tfidfForJobskill), new Set(skillsTFIDF));
        const education_score = calculateJaccardSimilarity(new Set(tfidfForJobeducation), new Set(educationTFIDF));
        filteredResumes.push({
            file: resume.file,
            score: position_score * 4 + skill_score * 5 + experience_score * 3 + education_score * 2,
            job_score: position_score,
            skill_score: skill_score,
            experience_score: experience_score,
            education_score: education_score,
        })
    })

    return filteredResumes




}

export const uploadResume = (req: any, res: Response) => {
    console.log(req)
    let file = req.files.file;
    let date = new Date();

    let filename = date.getDate() + date.getTime() + file.name;

    let path = 'public/resume/' + filename;


    file.mv(path, (err: any, result: any) => {
        if (err) {
            return res.status(200).json({
                error: true,
                message: "Can not upload File"
            })
        } else {

            return res.status(200).json({
                error: false,
                message: "File uploaded successfully"
            })
        }
    })
}


export const resumeFinder = async (req: Request, res: Response, next: NextFunction) => {
    const { jobDescription }: GetResume = req.body as GetResume;

    if (jobDescription) {
        try {


            const jobdata: Job = await extractInformation("Job Description", jobDescription);
            const resumedata: Job[] | undefined = await processPDFsInDirectory("public/resume/");

            const filteredResumes = filterResume(jobdata, resumedata);







            return res.status(200).json({
                error: false,
                filteredResumes: filteredResumes.sort((a, b) => a.score > b.score ? -1 : 1)
            })
        } catch (error) {
            return res.status(200).json({
                error: true,
                message: error
            })

        }
    }
    else {
        return res.status(200).json({
            error: true,
            message: "Please provide valid job description"
        })
    }

}