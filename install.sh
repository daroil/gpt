#!/bin/bash

# Update the package list
sudo apt update

# Install Node.js and npm
echo "Installing Node.js and npm..."
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node -v
npm -v

# Install build tools (required for some npm packages, especially those using native addons)
echo "Installing build tools..."
sudo apt install -y build-essential

# Optionally, you might want to install yarn globally if you prefer it over npm
# curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
# echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
# sudo apt update && sudo apt install yarn

# If you are using a project that requires npm packages, uncomment and run the following lines:
echo "Installing necessary npm packages..."
# Example: npm install -g express mongoose body-parser

# If your server script is written in Python or another language, ensure it's installed too.
# For example, if you are using a Python web framework like Flask:
# sudo apt install python3 python3-pip
# pip3 install flask

echo "Installation of the npm and node js complete!"

curl https://ollama.ai/install.sh | sh
ollama pull llama3
ollama pull deepseek-coder-v2
ollama pull deepseek-r1
