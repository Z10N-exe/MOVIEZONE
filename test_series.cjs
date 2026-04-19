const axios = require('axios');
const API_URL = 'http://127.0.0.1:5000/api';

async function testSeries() {
    try {
        const id = '9028867555875774472'; // Wednesday
        console.log('Fetching info for series:', id);
        const response = await axios.get(`${API_URL}/info/${id}`);
        console.log('Response Status:', response.data.status);
        const subject = response.data.data.subject;
        console.log('Subject Type:', subject.subjectType);
        
        // Check for episodes/seasons
        console.log('Keys in subject:', Object.keys(subject));
        if (subject.episodeVo) {
            console.log('episodeVo found. count:', subject.episodeVo.length);
            console.log('Sample episode:', JSON.stringify(subject.episodeVo[0], null, 2));
        } else if (subject.seasons) {
            console.log('seasons found:', subject.seasons.length);
        } else {
            console.log('No traditional episode list found. Checking data keys:', Object.keys(response.data.data));
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSeries();
