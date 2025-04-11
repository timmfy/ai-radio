package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type PromptRequest struct {
	Prompt string `json:"prompt"`
}

type Track struct {
	Title  string `json:"title"`
	Artist string `json:"artist"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func GenerateTracks(c *gin.Context) {
	var input PromptRequest
	if err := c.BindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input"})
		return
	}

	apiKey := os.Getenv("OPENAI_API_KEY")

	requestBody := map[string]interface{}{
		"model": "gpt-4",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a music expert. Given a user's mood or request, return only a JSON array of 10 songs that match the vibe. Each song must include 'title' and 'artist'. Format it as valid JSON.",
			},
			{
				"role":    "user",
				"content": input.Prompt,
			},
		},
	}

	body, _ := json.Marshal(requestBody)

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OpenAI request creation failed"})
		return
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OpenAI request failed"})
		return
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var aiResp OpenAIResponse
	if err := json.Unmarshal(respBody, &aiResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse OpenAI response"})
		return
	}

	var songs []Track
	if err := json.Unmarshal([]byte(aiResp.Choices[0].Message.Content), &songs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse song list"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"songs": songs})
}
