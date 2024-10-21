document.addEventListener('DOMContentLoaded', function() {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const apiKey = process.env.MISTRAL_API_KEY; // Replace with your actual API key

    addMessage('system', "Initialized")

    async function sendMessage() {
        const userMessage = userInput.value.trim();
        if (userMessage === '') return;

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
                    messages: [{role: 'system', content: "You are a helpful and friendly AI assistant. You were created by AdyTech99 to serve as tech support. AdyTech99 is a Minecraft Mod developer. You will use your knowledge to assist users with AdyTech99's Minecraft Mods. Remain professional at all times"},
                    { role: 'user', content: message }]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('Error:', error);
            return 'Sorry, something went wrong. Please try again later.';
        }
    }

    function addMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender);
        messageElement.innerHTML = `<div class="message">${message}</div>`;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendMessage();
        }
    });
});