document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const apiKey = "CprFHbGhpWTfOG97dFBgRLi3OmRtUOA7"; // Replace with your actual API key
    const systemPrompt = "You are a customer support agent. Your job is to direct the customer to the most appropriate resource location. " +
                         "You will be provided with a chunk of text along with the user's query. Use that text to give relevant and correct information. " +
                         "If the provided text does not contain relevant information to answer the user's query, apologize and refer them to the Discord server for further assistance: https://discord.gg/4eWX2duHfJ. " +
                         "Specific instructions: " +
                         "- If the customer wishes to download a mod, provide them with the download link. " +
                         "- If the customer has a question about how to use the mod, answer it based on the provided text. " +
                         "- If the customer wants to report a bug, encourage them to either go to the Mod's GitHub from the GitHub link on the Modrinth sidebar, or to open a bug report from the Discord server: https://discord.gg/4eWX2duHfJ. " +
                         "Do not hallucinate. If the provided text does not contain the necessary information, politely inform the user that you don't have the answer and refer them to the Discord server for further assistance.";



    // Update the initial conversation history with the system prompt
    let conversationHistory = [
        {
            role: 'system',
            content: systemPrompt
        }
    ];


   /* let conversationHistory = [
        {
            role: 'system',
            content: "You are a customer support agent. Your job is to direct the customer to the most appropriate resource location. You will be provided with a chunk of text along with the user's query. Use that text to give relevant and correct information" +
                      "If the customer wishes to download a mod, provide them with the download link" +
                      "If the customer has a question about how to use the mod, then based on the context given, answer it" +
                      "If the customer wants to report a bug, encourage them to either go to the Mod's GitHub from the GitHub link on the Modrinth sidebar, or to open a bug report from the Discord server: https://discord.gg/4eWX2duHfJ"
        }
    ];*/

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
            //    throw new Error('Embedding request failed');
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

    // Function to retrieve relevant information from the knowledge base
    async function fetchRelevantInfo(query) {
        // Load the knowledge base document
        const response = await fetch('assets/js/modinfo.txt');
        const modInfoText = await response.text();

        // Embed the entire knowledge base document
            const documentEmbedding = await getEmbeddings(modInfoText);

            // Split the document into chunks (e.g., by paragraph)
            const chunks = modInfoText.split('\n\n'); // Adjust the delimiter as needed

            // Embed the user query
            const queryEmbedding = await getEmbeddings(query);

            // Wait for one second before making the next embedding call
            await new Promise(resolve => setTimeout(resolve, 1000));

            let maxSimilarity = -1;
            let mostRelevantChunk = "";

            // Calculate similarity between the query and each chunk
            for (const chunk of chunks) {
                const chunkEmbedding = await getEmbeddings(chunk); // Use the entire document embedding for each chunk
                const similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);

                if (similarity > maxSimilarity) {
                    maxSimilarity = similarity;
                    mostRelevantChunk = chunk;
                }
            }

            // If no relevant chunk found, return a default message
            if (maxSimilarity <= 0.5) {
                return "No relevant information found.";
            }

            return mostRelevantChunk;
        }

    // Function to calculate cosine similarity
    function cosineSimilarity(vecA, vecB) {
        if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
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

        // Add user message to the conversation history
        conversationHistory.push({ role: 'user', content: userMessage });

        // Add user message to the chat
        addMessage('user', userMessage);
        userInput.value = '';

        // Get AI response from Mistral AI API
        const aiMessage = await getAiResponse(userMessage);
        addMessage('ai', aiMessage);
    }

    async function getAiResponse(message) {
        try {
            // Fetch relevant information from the knowledge base
            const retrievedInfo = await fetchRelevantInfo(message);

            // Add retrieved information to the conversation history
            //conversationHistory.push({ role: 'system', content: retrievedInfo });

            // Wait for one second before making the next API call
            await new Promise(resolve => setTimeout(resolve, 1280));

            // Get AI response from Mistral AI API
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
                    //messages: conversationHistory
                })
            });

            if (!response.ok) {
                //throw new Error('API request failed');
            }

            const data = await response.json();
            const aiMessage = data.choices[0].message.content.trim();

            // Add AI message to the conversation history
            conversationHistory.push({ role: 'assistant', content: aiMessage });

            return "retrieved info : " + retrievedInfo + "\n" + "\n" +  aiMessage;
        } catch (error) {
            console.error('Error:', error);
            //return 'Sorry, something went wrong. Please try again later.';
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
        // Replace markup syntax with HTML tags
        message = message
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
            .replace(/\*(.+?)\*/g, '<em>$1</em>') // *italic*
            .replace(/##(.+)/g, '<h2>$1</h2>') // ##heading
            .replace(/#(.+)/g, '<h1>$1</h1>') // #heading
            .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a style="color:white" href="$2" target="_blank">$1</a>'); // [Text here](https://example.com)

        // Replace line breaks with <br> tags
        message = message.replace(/\n/g, '<br>');

        // Wrap paragraphs in <p> tags
        message = message.replace(/(<br>){2,}/g, '</p><p>');
        message = '<p>' + message + '</p>';

        return message;
    }

    userInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            if (event.shiftKey) {
                // Insert a new line if Shift+Enter is pressed
                event.preventDefault();
                const start = userInput.selectionStart;
                const end = userInput.selectionEnd;
                userInput.value = userInput.value.substring(0, start) + '\n' + userInput.value.substring(end);
                userInput.selectionStart = userInput.selectionEnd = start + 1;
            } else {
                // Send the message if Enter is pressed without Shift
                sendMessage();
            }
        }
    });

    sendButton.addEventListener('click', sendMessage);
});