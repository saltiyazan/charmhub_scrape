let allData = []; // Store fetched data
let consolidatedData = []; // Store all packages in a single array
let tlsData = []; // Store tls-certificates data
let sortDirection = {
    name: 'asc',
    platform: 'asc'
}; // Track sorting direction

// Function to fetch data for a specific page
async function fetchDataForPage(page) {
    try {
        const response = await fetch(`/data?page=${page}`);
        if (!response.ok) {
            throw new Error(`Failed to load data for page ${page}: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Failed to load data for page ${page}:`, error);
    }
}

// Function to fetch tls-certificates data
async function fetchTlsData() {
    try {
        const response = await fetch('/tls-certificates');
        if (!response.ok) {
            throw new Error(`Failed to load tls-certificates data: ${response.statusText}`);
        }
        return response.json();
    } catch (error) {
        console.error(`Failed to load tls-certificates data:`, error);
    }
}

// Function to fetch all pages
async function fetchAllPages() {
    try {
        // Check if data is already in localStorage
        const cachedData = localStorage.getItem('consolidatedData');
        if (cachedData) {
            consolidatedData = JSON.parse(cachedData);
            const tlsDataResponse = await fetchTlsData();
            tlsData = [...tlsDataResponse.other_charms.providers, ...tlsDataResponse.other_charms.requirers];
            processData(consolidatedData);
            return;
        }

        // Start by fetching the first page to know the total number of pages
        const firstPage = await fetchDataForPage(1);
        if (!firstPage) return;
        const totalPages = 1;
        allData = [firstPage]; // Initialize with the first page of results

        // Fetch remaining pages
        const fetchPromises = [];
        for (let page = 2; page <= totalPages; page++) {
            fetchPromises.push(fetchDataForPage(page));
        }
        const remainingData = await Promise.all(fetchPromises);

        // Combine the first page and the remaining pages
        remainingData.forEach(data => allData.push(data));

        // Consolidate all packages into a single array
        consolidatedData = allData.flatMap(data => data.packages.filter(pkg => pkg.package.type === 'charm'));

        // Store data in localStorage
        localStorage.setItem('consolidatedData', JSON.stringify(consolidatedData));

        // Fetch tls-certificates data
        const tlsDataResponse = await fetchTlsData();
        tlsData = [...tlsDataResponse.other_charms.providers, ...tlsDataResponse.other_charms.requirers];

        // Now process all fetched data
        processData(consolidatedData);
    } catch (error) {
        console.error('Error fetching all pages:', error);
    }
}

// Process and display the data in the table
async function processData(data) {
    const table = document.getElementById('data-table');
    table.innerHTML = `
        <div class="row header">
            <div class="cell">#</div>
            <div class="cell" onclick="sortTable('name')">Name</div>
            <div class="cell" onclick="sortTable('platform')">Platform</div>
            <div class="cell">URL</div>
            <div class="cell">Uses tls-certificates interface</div>
            <div class="cell">Repo</div>
            <div class="cell">Uses TLS Lib</div>
        </div>
    `;

    let rowIndex = 1;
    let countUsingTls = 0;
    let tlsVersionCounts = { v0: 0, v1: 0, v2: 0, v3: 0, v4: 0 };

    for (const pkg of data) {
        const row = document.createElement('div');
        row.className = 'row';

        // Create row number cell
        const rowNumberCell = document.createElement('div');
        rowNumberCell.className = 'cell';
        rowNumberCell.textContent = rowIndex++;
        row.appendChild(rowNumberCell);

        // Create name cell
        const name = pkg.package.name || pkg.package.description || 'N/A';
        const nameCell = document.createElement('div');
        nameCell.className = 'cell';
        nameCell.textContent = name;
        row.appendChild(nameCell);

        // Create platform cell
        const platformCell = document.createElement('div');
        platformCell.className = 'cell';
        platformCell.textContent = pkg.package.platforms.join(', ');
        row.appendChild(platformCell);

        // Create URL cell
        const urlCell = document.createElement('div');
        urlCell.className = 'cell';
        const urlLink = document.createElement('a');
        urlLink.href = `https://charmhub.io/${name}`;
        urlLink.textContent = `https://charmhub.io/${name}`;
        urlCell.appendChild(urlLink);
        row.appendChild(urlCell);

        // Create tls-certificates interface cell
        const usesTlsCell = document.createElement('div');
        usesTlsCell.className = 'cell';
        const usesTls = tlsData.some(tls => tls.name === name) ? '✔️' : '';
        if (usesTls){
            countUsingTls++;
        }
        usesTlsCell.textContent = usesTls;
        row.appendChild(usesTlsCell);

        // Create repo cell
        const repoCell = document.createElement('div');
        repoCell.className = 'cell';
        row.appendChild(repoCell);
        bugLink = await addBugLink(repoCell, name);  // Call to asynchronously fetch and format the repo URL

        // Create repo cell
        const usesTlsLibCell = document.createElement('div');
        usesTlsLibCell.className = 'cell';
        row.appendChild(usesTlsLibCell);
        libv = await fetchTlsVersion(bugLink);  // Call to asynchronously fetch and format the repo URL
        if (libv && tlsVersionCounts.hasOwnProperty(libv)) {
                tlsVersionCounts[libv]++;
        }
        usesTlsLibCell.textContent = libv;

        // Update summary with the total number of charms
        const totalCharms = data.length;
        const percentageRatioUsingTls = 100 * (countUsingTls / totalCharms);

        // Update summary with the total number of charms and TLS usage ratio
        const totalTlsLib = Object.values(tlsVersionCounts).reduce((sum, count) => sum + count, 0);
        const percentageRatioUsingTlsLib = 100 * (totalTlsLib / totalCharms);
        const percentageV0 = 100 * (tlsVersionCounts.v0 / totalTlsLib);
        const percentageV1 = 100 * (tlsVersionCounts.v1 / totalTlsLib);
        const percentageV2 = 100 * (tlsVersionCounts.v2 / totalTlsLib);
        const percentageV3 = 100 * (tlsVersionCounts.v3 / totalTlsLib);
        const percentageV4 = 100 * (tlsVersionCounts.v4 / totalTlsLib);

        const summaryDiv = document.getElementById('summary');
        summaryDiv.innerHTML = `
            <strong>Total Number of Charms:</strong> ${totalCharms}<br>
            <strong>Charms Using Certificates Interface:</strong> ${countUsingTls}, <strong>Ratio:</strong> ${percentageRatioUsingTls}%<br>
            <strong>Charms Using the TLS Lib:</strong> <strong>${totalTlsLib}</strong>, <strong>Ratio:</strong> ${percentageRatioUsingTlsLib}%<br>
            <strong>TLS Versions:</strong><br> 
            <strong>V0:</strong> ${tlsVersionCounts.v0}, <strong>Ratio:</strong> ${percentageV0}%<br> 
            <strong>V1:</strong> ${tlsVersionCounts.v1}, <strong>Ratio:</strong> ${percentageV1}%<br>
            <strong>V2:</strong> ${tlsVersionCounts.v2}, <strong>Ratio:</strong> ${percentageV2}%<br>
            <strong>V3:</strong> ${tlsVersionCounts.v3}, <strong>Ratio:</strong> ${percentageV3}%<br> 
            <strong>V4:</strong> ${tlsVersionCounts.v4}, <strong>Ratio:</strong> ${percentageV4}%<br>`;
        
        table.appendChild(row);
    }
}


// Function to sort the table
function sortTable(key) {
    const direction = sortDirection[key];
    consolidatedData.sort((a, b) => {
        if (key === 'name') {
            return direction === 'asc' ? a.package.name.localeCompare(b.package.name) : b.package.name.localeCompare(a.package.name);
        } else if (key === 'platform') {
            const platformA = a.package.platforms.join(', ');
            const platformB = b.package.platforms.join(', ');
            return direction === 'asc' ? platformA.localeCompare(platformB) : platformB.localeCompare(platformA);
        }
    });
    sortDirection[key] = direction === 'asc' ? 'desc' : 'asc'; // Toggle sort direction
    processData(consolidatedData); // Re-process data to reflect sorted order
}

function formatRepoUrl(url) {
    let newUrl = url;

    // Check if it's a Launchpad bug URL
    if (newUrl.includes('bugs.launchpad.net')) {
        newUrl = newUrl.replace('bugs.launchpad.net', 'git.launchpad.net');
        const filebugIndex = newUrl.indexOf('+filebug');
        if (filebugIndex !== -1) {
            newUrl = newUrl.substring(0, filebugIndex);  // Remove '+filebug' and everything after
        }
    }

    return newUrl;
}

// Function to add the bug link to the table cell
async function addBugLink(cell, charmName) {
    try {
        // Fetch the bug link from a server-side endpoint
        const bugUrlResponse = await fetch(`/bug-url?url=${encodeURIComponent(`https://charmhub.io/${charmName}`)}`);
        if (!bugUrlResponse.ok) {
            throw new Error(`Failed to fetch bug URL: ${bugUrlResponse.statusText}`);
        }
        const bugUrlData = await bugUrlResponse.json();

        console.log("Received bug link:", bugUrlData.url); // Debug log to inspect the received URL

        // Determine the appropriate format based on the URL
        let formattedUrl = bugUrlData.url;
        console.log("Formatted URL before processing:", formattedUrl); // Additional debug log

        if (formattedUrl.includes("github.com")) {
            formattedUrl = formattedUrl.replace(/\/issues.*$/, ''); // Removes '/issues' and following parts for GitHub URLs
        } else if (formattedUrl.includes("launchpad.net")) {
            console.log("Processing a LaunchPad URL"); // Debug to confirm entering this block
            formattedUrl = formattedUrl.replace(/\/\+filebug.*$/, ''); // Strips '/+filebug' and following parts for LaunchPad URLs
            formattedUrl = formattedUrl.replace(/https:\/\/bugs./, 'https://git.'); // Changes domain for LaunchPad URLs to use 'git' subdomain
        }

        cell.textContent = formattedUrl;
        return formattedUrl;
    } catch (error) {
        console.error('Error fetching bug URL:', error);
        cell.textContent = 'Error fetching URL';
    }
}
async function fetchTlsVersion(baseRepoUrl) {
    try {
        const response = await fetch(`/tls-version?url=${encodeURIComponent(baseRepoUrl)}`);
        const data = await response.json();
        return data.version;
    } catch (error) {
        console.error('Error fetching TLS library version:', error);
        return 'N/A';
    }
}



// Initiate fetching all pages on page load
fetchAllPages();
