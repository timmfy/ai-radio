package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"ai-radio/handlers"
)

func main() {
	_ = godotenv.Load()

	r := gin.Default()
	r.Use(corsMiddleware())

	r.GET("/login", handlers.SpotifyLogin)
	r.GET("/callback", handlers.SpotifyCallback)
	r.POST("/api/generate-tracks", handlers.GenerateTracks)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8888"
	}
	log.Println("Running on port", port)
	r.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "*")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
