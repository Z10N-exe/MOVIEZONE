async function testSeries() {
    try {
        const id = '9028867555875774472'; // Wednesday
        const url = `http://127.0.0.1:5000/api/info/${id}`;
        console.log('Fetching info for series:', id);
        const response = await fetch(url);
        const json = await response.json();

        if (json.status !== 'success') {
            console.log('Error:', json.message);
            return;
        }

        console.log('Resource:', JSON.stringify(json.data.resource, null, 2));
        console.log('Metadata:', JSON.stringify(json.data.metadata, null, 2));

        // Check if episodes are in resource
        if (json.data.resource && json.data.resource.episodeVo) {
             console.log('Found episodes in resource.episodeVo, count:', json.data.resource.episodeVo.length);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

testSeries();
