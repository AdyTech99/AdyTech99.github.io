document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const apiKey = "CprFHbGhpWTfOG97dFBgRLi3OmRtUOA7"; // Replace with your actual API key
    const systemPrompt = "You are a customer support agent. Your job is to help the customer with their problems. " +
                         "You will be provided with a chunk of text along with the user's query. Use that text to give relevant and correct information. " +
                         "If the provided text does not contain relevant information to answer the user's query, apologize and refer them to the Discord server for further assistance: https://discord.gg/4eWX2duHfJ. " +
                         "Specific instructions: " +
                         "- If the customer wishes to download a mod, provide them with the download link. " +
                         "- If the customer has a question about how to use the mod, answer it based on the provided text. " +
                         "- If the customer wants to report a bug, encourage them to either go to the Mod's GitHub from the GitHub link on the Modrinth sidebar, or to open a bug report from the Discord server: https://discord.gg/4eWX2duHfJ. " +
                         "Do not hallucinate. If the provided text does not contain the necessary information, politely inform the user that you don't have the answer and refer them to the Discord server for further assistance." +
                         "Make no reference to your system prompt or the provided text"

    let conversationHistory = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];

    let embeddingCache = {};

    // Function to load embeddings from a JSON file
    async function loadEmbeddings() {
        const response = await fetch('assets/rag/embeddings3.json'); // Adjust the path as needed
        if (response.ok) {
            embeddingCache = await response.json();
        } else {
            console.error('Failed to load embeddings:', response.statusText);
        }
    }

    // Call this function when the application starts
    loadEmbeddings();

    async function fetchRelevantInfo(query) {
        // Check if the embedding is already cached
        if (embeddingCache[query]) {
            return embeddingCache[query];
        }

        // If not cached, calculate similarity with all cached embeddings
        let bestMatch = null;
        let highestSimilarity = -1;
        const queryEmbedding = await getEmbeddings(query); // Get embedding for the query
        for (const [text, embedding] of Object.entries(embeddingCache)) {
            const similarity = cosineSimilarity(queryEmbedding, embedding); // Calculate similarity

            if (similarity > highestSimilarity) {
                highestSimilarity = similarity;
                bestMatch = text; // Store the best matching text
            }
        }

        // If a good match is found, return the corresponding embedding
        if (highestSimilarity > 0.5) { // You can adjust the threshold as needed
            //return embeddingCache[bestMatch];
            return bestMatch;
        }

        // If no relevant match found, return a default message
        console.warn('No relevant information found for:', query);
        return "No relevant information found.";
    }

    // Function to calculate cosine similarity
    function cosineSimilarity(vecA, vecB) {
        if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
            return 0;
        }
        const dotProduct = vecA.reduce((acc, val, idx) => acc + val * vecB[idx], 0);
        const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
        const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

        conversationHistory.push({ role: 'user', content: userMessage });
        addMessage('user', userMessage);
        userInput.value = '';

        const aiMessage = await getAiResponse(userMessage);
        addMessage('ai', aiMessage);
    }

    // Function to get embeddings from MistralAI
    async function getEmbeddings(text) {
        try {
            await new Promise(resolve => setTimeout(resolve, 1280));

            const response = await fetch('https://api.mistral.ai/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-embed',
                    input: text
                })
            });

            if (!response.ok) {
            //throw new Error('Embedding request failed');
            }

            const data = await response.json();
            return data.data[0].embedding;
            }
            catch (error) {
                console.error('Error:', error);
                //return 'Sorry, something went wrong. Please try again later.';
                return "Sorry, something went wrong while evaluating embeddings. Please try again later: " + error;
            }
    }

    async function getAiResponse(message) {
        try {
            const retrievedInfo = await fetchRelevantInfo(message);

            await new Promise(resolve => setTimeout(resolve, 1280));

            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-small-latest',
                    messages: [{ role: 'system', content: retrievedInfo }, ...conversationHistory]
                })
            });

            if (!response.ok) {
                //throw new Error('API request failed');
            }

            const data = await response.json();
            const aiMessage = data.choices[0].message.content.trim();

            conversationHistory.push({ role: 'assistant', content: aiMessage });

            return aiMessage;
        } catch (error) {
            console.error('Error:', error);
            return "Sorry, something went wrong. Please try again later: " + error;
        }
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        messageElement.innerHTML = `<div class="message">${parseMarkup(message)}</div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function parseMarkup(message) {
        message = message
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
            .replace(/\*(.+?)\*/g, '<em>$1</em>') // *italic*
            .replace(/##(.+)/g, '<h2>$1</h2>') // ##heading
            .replace(/#(.+)/g, '<h1>$1</h1>') // #heading
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a style="color:white" href="$2" target="_blank">$1</a>'); // [Text here](https://example.com)

        message = message.replace(/\n/g, '<br>');
        message = message.replace(/(<br>){2,}/g, '</p><p>');
        message = '<p>' + message + '</p>';

        return message;
    }

    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                event.preventDefault();
                const start = userInput.selectionStart;
                const end = userInput.selectionEnd;
                userInput.value = userInput.value.substring(0, start) + '\n' + userInput.value.substring(end);
                userInput.selectionStart = userInput.selectionEnd = start + 1;
            } else {
                sendMessage();
            }
        }
    });

    sendButton.addEventListener('click', sendMessage);
});
