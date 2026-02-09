# Resume Generator

Generate professional resumes using Claude Agent SDK with web search capabilities.

## Features

- Researches a person using web search (LinkedIn, company pages, news, GitHub)
- Generates a professional 1-page resume as a `.docx` file
- Uses the `docx` library for Word document generation

## Usage

```bash
npm install
npm start "Person Name"
```

## How it works

1. Uses `WebSearch` to research the person's professional background
2. Gathers information about their current role, past experience, education, and skills
3. Generates a JavaScript file that creates the resume using the `docx` library
4. Executes the script to produce a `.docx` file

## Output

The generated resume is saved to `agent/custom_scripts/resume.docx`
