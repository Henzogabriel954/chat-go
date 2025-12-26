package main

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
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

// Arquivo para persistência
const ROOMS_FILE = "rooms.json"

// Estrutura para representar nosso "Smart Contract" (Sala de Chat)
type CryptoRoom struct {
	Address   string `json:"address"`    // ID Público da Sala (ex: 0x123...)
	AccessKey string `json:"access_key"` // Chave Privada para entrar
	QRString  string `json:"qr_string"`  // String que deve ser codificada no QR Code (ex: walletchat://0x..?key=..)
	CreatedAt int64  `json:"created_at"`
}

// Banco de dados em memória (simulando blockchain)
var (
	roomsMutex sync.RWMutex
	rooms      = make(map[string]CryptoRoom)
)

// --- PERSISTÊNCIA ---

func saveRoomsToFile() {
	roomsMutex.RLock()
	defer roomsMutex.RUnlock()

	data, err := json.MarshalIndent(rooms, "", "  ")
	if err != nil {
		fmt.Println("Erro ao salvar salas:", err)
		return
	}
	_ = os.WriteFile(ROOMS_FILE, data, 0644)
}

func loadRoomsFromFile() {
	roomsMutex.Lock()
	defer roomsMutex.Unlock()

	data, err := os.ReadFile(ROOMS_FILE)
	if err != nil {
		if os.IsNotExist(err) {
			return // Arquivo não existe, tudo bem
		}
		fmt.Println("Erro ao ler arquivo de salas:", err)
		return
	}

	if err := json.Unmarshal(data, &rooms); err != nil {
		fmt.Println("Erro ao decodificar salas:", err)
	} else {
		fmt.Printf("📂 Carregadas %d salas do disco.\n", len(rooms))
		// Backfill qr_string para compatibilidade com versões antigas
		for addr, rm := range rooms {
			if rm.QRString == "" {
				rm.QRString = fmt.Sprintf("walletchat://%s?key=%s", rm.Address, rm.AccessKey)
				rooms[addr] = rm
			}
		}
	}
}

// Função auxiliar para gerar hash estilo carteira (ex: 0x7f9a...)
func generateWalletAddress() string {
	b := make([]byte, 10) // 20 caracteres hex
	rand.Read(b)
	return "0x" + hex.EncodeToString(b)
}

func main() {
	// Carrega .env (se existir)
	_ = godotenv.Load() // Ignora erro se não existir .env

	// Carrega salas salvas
	loadRoomsFromFile()

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
			QRString:  fmt.Sprintf("walletchat://%s?key=%s", address, key),
		}

		roomsMutex.Lock()
		rooms[address] = newRoom
		roomsMutex.Unlock()

		// Salva no disco
		go saveRoomsToFile()

		// Retorna os dados para o criador
		c.JSON(http.StatusOK, gin.H{
			"status":     "success",
			"address":    newRoom.Address,
			"access_key": newRoom.AccessKey,
			"qr_string":  newRoom.QRString,
		})
	})

	// Rota: Obter dados de uma sala existente (inclui qr_string)
	r.GET("/api/contract/:address", func(c *gin.Context) {
		address := c.Param("address")
		roomsMutex.RLock()
		room, exists := rooms[address]
		roomsMutex.RUnlock()

		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error": "Sala não encontrada."})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"address":    room.Address,
			"access_key": room.AccessKey,
			"qr_string":  room.QRString,
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
