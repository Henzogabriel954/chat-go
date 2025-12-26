package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"sync"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/olahol/melody"
)

// Estrutura para representar nosso "Smart Contract" (Sala de Chat)
type CryptoRoom struct {
	Address   string `json:"address"`    // ID Público da Sala (ex: 0x123...)
	AccessKey string `json:"access_key"` // Chave Privada para entrar
	CreatedAt int64  `json:"created_at"`
}

// Banco de dados em memória (simulando blockchain)
var (
	roomsMutex sync.RWMutex
	rooms      = make(map[string]CryptoRoom)
)

// Função auxiliar para gerar hash estilo carteira (ex: 0x7f9a...)
func generateWalletAddress() string {
	b := make([]byte, 10) // 20 caracteres hex
	rand.Read(b)
	return "0x" + hex.EncodeToString(b)
}

func main() {
	// Carrega .env (se existir)
	_ = godotenv.Load() // Ignora erro se não existir .env

	r := gin.Default()

	// 1. Configuração de CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowAllOrigins = true // Permite qualquer origem (Frontend Vite, IP local, etc)
	r.Use(cors.New(corsConfig))

	// 2. Configuração do Melody
	m := melody.New()
	m.Config.MaxMessageSize = 1024 * 1024 // 1MB

	// --- API REST: Gerenciamento de "Contratos" (Salas) ---

	// Rota para Criar uma Nova Sala Segura
	r.POST("/api/contract/create", func(c *gin.Context) {
		address := generateWalletAddress()
		key := uuid.New().String() // Chave UUID v4 complexa

		newRoom := CryptoRoom{
			Address:   address,
			AccessKey: key,
		}

		roomsMutex.Lock()
		rooms[address] = newRoom
		roomsMutex.Unlock()

		// Retorna os dados para o criador
		c.JSON(http.StatusOK, gin.H{
			"status":     "success",
			"address":    newRoom.Address,
			"access_key": newRoom.AccessKey,
			"qr_string":  fmt.Sprintf("walletchat://%s?key=%s", newRoom.Address, newRoom.AccessKey),
		})
	})

	// --- WEBSOCKET: Conexão Segura ---

	// Rota: /ws/:address?key=uuid-da-chave
	r.GET("/ws/:address", func(c *gin.Context) {
		roomAddress := c.Param("address")
		accessKey := c.Query("key")

		// Validação de Segurança
		roomsMutex.RLock()
		room, exists := rooms[roomAddress]
		roomsMutex.RUnlock()

		if !exists {
			if accessKey != "public" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sala não encontrada."})
				return
			}
		} else {
			if room.AccessKey != accessKey {
				c.JSON(http.StatusForbidden, gin.H{"error": "Chave de Acesso Inválida."})
				return
			}
		}

		// Tudo certo, conecta o WebSocket
		m.HandleRequest(c.Writer, c.Request)
	})

	// --- EVENTOS DO MELODY ---

	m.HandleConnect(func(s *melody.Session) {
		userID := "User-" + generateWalletAddress()[2:6]
		s.Set("user_id", userID)
		// Opcional: Logar conexão
	})

	m.HandleMessage(func(s *melody.Session, msg []byte) {
		// Pega a sala atual e faz broadcast apenas para quem está nela
		urlPath := s.Request.URL.Path
		m.BroadcastFilter(msg, func(q *melody.Session) bool {
			return q.Request.URL.Path == urlPath
		})
	})

	// 6. Inicia o servidor
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000" // Fallback se .env não existir
	}

	fmt.Println("------------------------------------------------")
	fmt.Println("🔐 WalletChat Backend Rodando")
	fmt.Println("📡 Porta: " + port)
	fmt.Println("------------------------------------------------")
	
	// Escuta em todas as interfaces (IPv4/IPv6)
	r.Run(":" + port)
}
