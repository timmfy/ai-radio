package handlers

import (
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

func SpotifyLogin(c *gin.Context) {
	authURL := "https://accounts.spotify.com/authorize?response_type=code&client_id=" +
		os.Getenv("SPOTIFY_CLIENT_ID") +
		"&scope=user-read-private user-read-email streaming user-modify-playback-state user-read-playback-state" +
		"&redirect_uri=" + url.QueryEscape(os.Getenv("REDIRECT_URI"))

	c.Redirect(http.StatusFound, authURL)
}

func SpotifyCallback(c *gin.Context) {
	code := c.Query("code")
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", os.Getenv("REDIRECT_URI"))

	req, _ := http.NewRequest("POST", "https://accounts.spotify.com/api/token", strings.NewReader(data.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Authorization", "Basic "+base64.StdEncoding.EncodeToString([]byte(
		os.Getenv("SPOTIFY_CLIENT_ID")+":"+os.Getenv("SPOTIFY_CLIENT_SECRET"))))

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Token exchange failed"})
		return
	}
	defer resp.Body.Close()

	var tokenData map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&tokenData)

	accessToken := tokenData["access_token"].(string)
	redirect := "http://localhost:3000?access_token=" + accessToken
	c.Redirect(http.StatusFound, redirect)
}
