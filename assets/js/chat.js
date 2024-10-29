document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const apiKey = "CprFHbGhpWTfOG97dFBgRLi3OmRtUOA7"; // Replace with your actual API key

    let conversationHistory = [
        { role: 'system', content: "You are a helpful and friendly AI assistant. You were created by AdyTech99 to serve as tech support. AdyTech99 is a Minecraft Mod developer. You will use your knowledge to assist users with AdyTech99's Minecraft Mods. Remain professional at all times" }
    ];

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
            const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'mistral-large-latest',
                    messages: conversationHistory
                })
            });
            if (!response.ok) {
                throw new Error('API request failed');
            }
            const data = await response.json();
            const aiMessage = data.choices[0].message.content.trim();
            // Add AI message to the conversation history
            conversationHistory.push({ role: 'assistant', content: aiMessage });
            return aiMessage;
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, something went wrong. Please try again later.';
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
            .replace(/#(.+)/g, '<h1>$1</h1>'); // #heading

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