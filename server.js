const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Route to handle API requests for store data
app.get('/data', async (req, res) => {
    const page = req.query.page || 1;
    const url = `https://charmhub.io/beta/store.json?page=${page}`;
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching store data:', error);
        res.status(500).send('Failed to fetch data');
    }
});

// Route to handle API requests for tls-certificates data
app.get('/tls-certificates', async (req, res) => {
    const url = `https://charmhub.io/integrations/tls-certificates.json`;
    try {
        const response = await axios.get(url);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching tls-certificates data:', error);
        res.status(500).send('Failed to fetch tls-certificates data');
    }
});

const cheerio = require('cheerio');

app.get('/bug-url', async (req, res) => {
    try {
        const pageUrl = decodeURIComponent(req.query.url);
        const response = await axios.get(pageUrl);
        const $ = cheerio.load(response.data);

        // First attempt to find the Homepage link
        let homepageLink = $('a').filter(function() {
            return $(this).text().includes('Homepage');
        }).attr('href');

        // Check if the Homepage link is valid and not pointing to Charmhub
        if (homepageLink && (homepageLink.includes('github.com') || homepageLink.includes('launchpad.net') || homepageLink.includes('opendev.org'))) {
            homepageLink = homepageLink.replace(/\/$/, ''); // Remove trailing slash if exists
            res.json({ url: homepageLink });
            return;
        }

        // If Homepage is not valid, check for the Submit a Bug link
        const bugLink = $('a').filter(function() {
            return $(this).text().includes('Submit a bug');
        }).attr('href');

        // Modify the URL by removing '/issues' and anything that follows if it's a GitHub link
        const modifiedBugLink = bugLink ? bugLink.replace(/\/issues.*$/, '') : 'No link found';
        res.json({ url: modifiedBugLink });
    } catch (error) {
        console.error('Error fetching or parsing page:', error);
        res.status(500).send('Failed to fetch or parse page');
    }
});

app.get('/tls-version', async (req, res) => {
    const baseRepoUrl = req.query.url;
    const subdirectories = [
        "/tree/main/lib/charms/tls_certificates_interface/",
        "/tree/lib/charms/tls_certificates_interface/",
        "/tree/src/lib/charms/tls_certificates_interface/"
    ];
    const versions = ['v0', 'v1', 'v2', 'v3', 'v4'];

    for (let subdir of subdirectories) {
        for (let version of versions) {
            const versionUrl = `${baseRepoUrl}${subdir}${version}`;
            try {
                console.log(`${baseRepoUrl}${subdir}${version}`);
                const response = await axios.head(versionUrl);
                if (response.status === 200) {
                    console.log(`TLS version ${version} found at ${versionUrl}`);
                    return res.json({ version });
                }
            } catch (error) {
                // Continue to the next combination
            }
        }
    }
    res.json({ version: 'N/A' });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
