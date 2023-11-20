import { useState } from 'react';
import { generate } from 'random-words';
import moment from 'moment';
import { CopyToClipboard } from 'react-copy-to-clipboard';

// Mapping to store replaced words
const replacedWordMap = new Map();

const capitalizeFirstLetter = (word) => {
    return word.charAt(0).toUpperCase() + word.slice(1);
};

const isMonth = (word) => {
    const monthFormats = ['MMMM', 'MMM', 'MM', 'M'];
    return moment(word, monthFormats, true).isValid();
};

const getRandomMonth = () => {
    const allMonths = moment.months();
    const randomIndex = Math.floor(Math.random() * allMonths.length);
    return allMonths[randomIndex];
};

const getSynonym = async (word) => {
    return new Promise((resolve) => {
        if (/^https?:\/\/\S+$/.test(word)) {
            // If the word is a link, preserve it as is
            resolve(word);
        } else if (
            typeof word !== 'string' ||
            !isNaN(parseFloat(word)) ||
            /^\d+%$/.test(word)
        ) {
            // If the word is a number or percent, or not a string, return it as is
            resolve(word);
        } else if (word.trim() === '' || word.toUpperCase() === 'N/A') {
            // If the word is blank or "N/A", preserve it as is
            resolve(word);
        } else if (isMonth(word)) {
            // If the word is a month, replace it with a random month
            if (replacedWordMap.has(word)) {
                // Reuse the same replacement for the same month
                resolve(replacedWordMap.get(word));
            } else {
                const randomMonth = getRandomMonth();
                replacedWordMap.set(word, randomMonth);
                resolve(randomMonth);
            }
        } else {
            // Check if the word has already been replaced
            if (replacedWordMap.has(word)) {
                resolve(capitalizeFirstLetter(replacedWordMap.get(word)));
            } else {
                // Replace with a random word and capitalize the first letter
                const randomWord = capitalizeFirstLetter(generate());
                replacedWordMap.set(word, randomWord);
                resolve(randomWord);
            }
        }
    });
};

const renameJson = async (json) => {
    const processObject = async (obj) => {
        const renamedObject = {};

        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];

                if (Array.isArray(value)) {
                    // If the value is an array, rename its elements
                    const renamedArray = await renameJson(value);
                    renamedObject[key] = renamedArray;
                } else if (typeof value === 'object' && value !== null) {
                    // If the value is an object, recursively process it
                    const renamedNestedObject = await processObject(value);
                    renamedObject[key] = renamedNestedObject;
                } else if (typeof value === 'string') {
                    // If the value is a string, rename its words
                    const words = value.split(' ');
                    const renamedWords = await Promise.all(
                        words.map(getSynonym)
                    );
                    renamedObject[key] = renamedWords.join(' ');
                } else {
                    // If the value is not a string, array, or object, keep it unchanged
                    renamedObject[key] = value;
                }
            }
        }

        return renamedObject;
    };

    if (Array.isArray(json)) {
        // If the topmost value is an array, rename its elements
        return Promise.all(json.map(renameJson));
    } else if (typeof json === 'object' && json !== null) {
        // If the topmost value is an object, recursively process it
        return processObject(json);
    } else {
        // If the topmost value is not an array or object, return it unchanged
        return json;
    }
};

const Home = () => {
    const [inputJson, setInputJson] = useState('');
    const [outputJson, setOutputJson] = useState('');
    const [jsonError, setJsonError] = useState('');

    const handleInputChange = (event) => {
        setInputJson(event.target.value);
        setJsonError(null); // Clear any previous errors when input changes
    };

    const handleProcessClick = async () => {
        try {
            // Check if the input is empty
            if (!inputJson.trim()) {
                throw new Error('Input is empty.');
            }

            const parsedJson = JSON.parse(inputJson);
            const renamedJson = await renameJson(parsedJson);
            setOutputJson(JSON.stringify(renamedJson, null, 2));
        } catch (error) {
            console.error('Error processing JSON:', error);
            setJsonError(error.message);
        }
    };

    return (
        <div>
            <h1>JSON Renamer</h1>
            <p style={{ color: 'red' }}>{jsonError}</p>
            <textarea
                placeholder="Paste your JSON here..."
                rows={10}
                cols={50}
                value={inputJson}
                onChange={handleInputChange}
            />
            <br />

            <button onClick={handleProcessClick}>Process</button>
            <br />
            <br />
            <textarea
                placeholder="Resulting JSON..."
                rows={10}
                cols={50}
                value={outputJson}
                readOnly
            />
            <br />
            <CopyToClipboard text={outputJson}>
                <button>Copy</button>
            </CopyToClipboard>
        </div>
    );
};

export default Home;
