import os
from flask import Flask, render_template, request, jsonify, session
import requests
import uuid
import json
from datetime import datetime
import markdown

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.urandom(24)  # For session management

# Deepseek API configuration
DEEPSEEK_API_KEY = os.environ.get("DEEPSEEK_API_KEY", "your_deepseek_api_key_here")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"  # Update with the actual Deepseek API endpoint

# Default system message for chat context
DEFAULT_SYSTEM_MESSAGE = """You are a helpful assistant created by Deepseek."""

def generate_response(messages):
    """
    Generate a response from the Deepseek API based on the conversation history.
    
    Args:
        messages (list): List of message dictionaries with role and content keys
        
    Returns:
        str: The generated response text
    """
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}"
    }
    
    data = {
        "model": "deepseek-chat",  # Update with the appropriate Deepseek model
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2000
    }
    
    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data)
        response.raise_for_status()  # Raise an exception for HTTP errors
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        print(f"Error calling Deepseek API: {e}")
        return f"Sorry, I encountered an error: {str(e)}"

def get_chat_history():
    """
    Get the chat history from the session or initialize a new one.
    
    Returns:
        list: List of message dictionaries
    """
    if "chat_id" not in session:
        session["chat_id"] = str(uuid.uuid4())
    
    if "messages" not in session:
        session["messages"] = [
            {"role": "system", "content": DEFAULT_SYSTEM_MESSAGE}
        ]
    
    return session["messages"]

def save_chat_history(messages):
    """
    Save the chat history to the session.
    
    Args:
        messages (list): List of message dictionaries
    """
    session["messages"] = messages

@app.route("/")
def index():
    """Render the main chat interface."""
    return render_template("index.html")

@app.route("/api/chat", methods=["POST"])
def chat():
    """API endpoint for chat interactions."""
    data = request.json
    user_message = data.get("message", "").strip()
    
    if not user_message:
        return jsonify({"error": "Empty message"}), 400
    
    # Get chat history
    messages = get_chat_history()
    
    # Add user message to history
    messages.append({"role": "user", "content": user_message})
    
    # Generate response
    assistant_response = generate_response(messages)
    
    # Add assistant response to history
    messages.append({"role": "assistant", "content": assistant_response})
    
    # Save updated history
    save_chat_history(messages)
    
    # Convert markdown to HTML for display
    html_response = markdown.markdown(assistant_response)
    
    return jsonify({
        "response": assistant_response,
        "html_response": html_response,
        "timestamp": datetime.now().isoformat()
    })

@app.route("/api/new_chat", methods=["POST"])
def new_chat():
    """Start a new chat session."""
    session.pop("messages", None)
    session["chat_id"] = str(uuid.uuid4())
    return jsonify({"success": True, "chat_id": session["chat_id"]})

@app.route("/api/get_history", methods=["GET"])
def get_history():
    """Get the current chat history."""
    messages = get_chat_history()
    # Filter out system messages for the client
    client_messages = [msg for msg in messages if msg["role"] != "system"]
    return jsonify({"messages": client_messages})

@app.route("/api/update_system_message", methods=["POST"])
def update_system_message():
    """Update the system message for the current chat."""
    data = request.json
    new_system_message = data.get("system_message", "").strip()
    
    if not new_system_message:
        return jsonify({"error": "Empty system message"}), 400
    
    messages = get_chat_history()
    
    # Find and update system message
    for i, msg in enumerate(messages):
        if msg["role"] == "system":
            messages[i]["content"] = new_system_message
            break
    else:
        # If no system message exists, add one
        messages.insert(0, {"role": "system", "content": new_system_message})
    
    save_chat_history(messages)
    return jsonify({"success": True})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))