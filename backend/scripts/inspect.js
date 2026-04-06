import { EventSource } from 'eventsource';

const WIKIMEDIA_STREAM_URL = 'https://stream.wikimedia.org/v2/stream/recentchange';

const eventSource = new EventSource(WIKIMEDIA_STREAM_URL);

console.log('--- STARTING 1000 SAMPLE HUMAN AUDIT ---');

const ipv4Regex = /^\d{1,3}(\.\d{1,3}){3}$/;
const ipv6Regex = /^[0-9a-fA-F:]+:[0-9a-fA-F:]*$/;

let humanCount = 0;
const results = {
    masked: [],
    ipv4: [],
    ipv6: [],
    registered: [],
    unusual: []
};

eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    if (data.bot) return;

    humanCount++;
    const user = data.user || '';

    if (user.startsWith('~')) {
        if (!results.masked.includes(user)) results.masked.push(user);
    } else if (ipv4Regex.test(user)) {
        if (!results.ipv4.includes(user)) results.ipv4.push(user);
    } else if (ipv6Regex.test(user)) {
        if (!results.ipv6.includes(user)) results.ipv6.push(user);
    } else if (/^\d/.test(user)) {
        // Starts with a digit but failed IP regex
        if (!results.unusual.includes(user)) results.unusual.push(user);
    } else {
        if (results.registered.length < 50 && !results.registered.includes(user)) {
            results.registered.push(user);
        }
    }

    if (humanCount % 200 === 0) console.log(`Processed ${humanCount} humans...`);

    if (humanCount >= 1000) {
        console.log('\n--- AUDIT COMPLETE ---');
        console.log(`Total Human Samples: ${humanCount}`);
        console.log(`Masked Accounts (~): ${results.masked.length} unique found`);
        console.log(`IPv4 Addresses: ${results.ipv4.length} unique found`);
        console.log(`IPv6 Addresses: ${results.ipv6.length} unique found`);
        console.log(`Starts with Digit (Not IP): ${results.unusual.length} unique found`);
        
        console.log('\n--- EXAMPLES ---');
        console.log('Masked:', results.masked.slice(0, 5));
        console.log('IPv4:', results.ipv4.slice(0, 5));
        console.log('IPv6:', results.ipv6.slice(0, 5));
        console.log('Unusual (Digit-start):', results.unusual.slice(0, 5));
        console.log('Standard Registered:', results.registered.slice(0, 5));
        
        process.exit(0);
    }
  } catch (e) {
    // ignore
  }
};
