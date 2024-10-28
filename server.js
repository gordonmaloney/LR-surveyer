const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const app = express();
const port = 3000;

// Read the JSON configuration file
const surveyConfig = JSON.parse(fs.readFileSync('survey-answers.json', 'utf8'));

// Function to escape dots and add the '#' prefix for IDs
function escapeSelector(selector) {
  return `#${selector.replace(/\./g, '\\.')}`;
}

app.get('/fill-survey', async (req, res) => {
  try {
    // Launch Puppeteer in non-headless mode
    const browser = await puppeteer.launch({ headless: false, defaultViewport: null });
    const page = await browser.newPage();

    // Navigate to the first survey page
    await page.goto('https://consultationhub.edinburgh.gov.uk/sfc/visitor-levy/consultation/intro/');
    console.log('Navigated to the first page.');

    // Iterate over each page in the survey configuration
    for (let i = 0; i < surveyConfig.pages.length; i++) {
      const pageConfig = surveyConfig.pages[i];
      const { fields } = pageConfig;

      // Iterate over each field in the current page
      for (const [selector, value] of Object.entries(fields)) {
        try {
          const formattedSelector = escapeSelector(selector);
          console.log(`Trying to interact with: ${formattedSelector}`);

          // Wait for the field to be available
          await page.waitForSelector(formattedSelector, { timeout: 60000 });

          if (value === "checked") {
            // Click the radio button or checkbox
            await page.click(formattedSelector);
          } else {
            // Otherwise, type the value into the input field
            await page.type(formattedSelector, req.query[selector] || value);
          }
        } catch (err) {
          console.error(`Error with selector ${selector}: ${err.message}`);
        }
      }

      // If there's another page, click the "Next" or "Submit" button
      if (i < surveyConfig.pages.length - 1) {
        try {
          // Wait for the submit/next button and click it
          await page.waitForSelector('button[type="submit"]', { timeout: 60000 });
          await page.click('button[type="submit"]');

          // Wait for the next page to load
          await page.waitForNavigation();
          console.log(`Navigated to page ${i + 2}.`);
        } catch (err) {
          console.error(`Error clicking submit button: ${err.message}`);
        }
      }
    }

    res.send('Survey completed. The browser is displaying the final page live.');

  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while filling the survey.');
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});