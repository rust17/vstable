package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
	"vstable-engine/internal/ast"
	"vstable-engine/internal/db"
)

type Response struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type ConnectRequest struct {
	ID      string `json:"id"`
	Dialect string `json:"dialect"`
	DSN     string `json:"dsn"`
}

type QueryRequest struct {
	ID     string        `json:"id"`
	SQL    string        `json:"sql"`
	Params []interface{} `json:"params"`
}

func main() {
	port := os.Getenv("VSTABLE_PORT")
	if port == "" {
		port = "39082"
	}

	dbManager := db.NewManager()
	mux := http.NewServeMux()

	// 健康检查
	mux.HandleFunc("/api/ping", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// 建立连接
	mux.HandleFunc("/api/connect", func(w http.ResponseWriter, r *http.Request) {
		var req ConnectRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := dbManager.Connect(ctx, req.ID, req.Dialect, req.DSN); err != nil {
			sendError(w, http.StatusInternalServerError, err)
			return
		}
		sendJSON(w, http.StatusOK, Response{Success: true})
	})

	// 执行查询
	mux.HandleFunc("/api/query", func(w http.ResponseWriter, r *http.Request) {
		var req QueryRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		driver, err := dbManager.Get(req.ID)
		if err != nil {
			sendError(w, http.StatusInternalServerError, err)
			return
		}

		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		result, err := driver.Query(ctx, req.SQL, req.Params)
		if err != nil {
			sendError(w, http.StatusInternalServerError, err)
			return
		}

		// 适配前端预期的格式
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": true,
			"rows":    result.Rows,
			"fields":  result.Fields,
			"data":    result.Rows, // 兼容性字段
		})
	})

	// 断开连接
	mux.HandleFunc("/api/disconnect", func(w http.ResponseWriter, r *http.Request) {
		id := r.URL.Query().Get("id")
		if err := dbManager.Disconnect(id); err != nil {
			sendError(w, http.StatusInternalServerError, err)
			return
		}
		sendJSON(w, http.StatusOK, Response{Success: true})
	})

	// SQL 生成：生成 ALTER TABLE SQL
	mux.HandleFunc("/api/diff", func(w http.ResponseWriter, r *http.Request) {
		var req ast.DiffRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		compiler, err := ast.GetCompiler(req.Dialect)
		if err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		sqls := compiler.GenerateAlterTableSql(req)
		sendJSON(w, http.StatusOK, Response{Success: true, Data: sqls})
	})

	// SQL 生成：生成 CREATE TABLE SQL
	mux.HandleFunc("/api/create-table", func(w http.ResponseWriter, r *http.Request) {
		var req ast.DiffRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		compiler, err := ast.GetCompiler(req.Dialect)
		if err != nil {
			sendError(w, http.StatusBadRequest, err)
			return
		}

		sqls := compiler.GenerateCreateTableSql(req)
		sendJSON(w, http.StatusOK, Response{Success: true, Data: sqls})
	})

	addr := ":" + port
	fmt.Printf("Engine listening on %s...\n", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func sendJSON(w http.ResponseWriter, status int, resp interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

func sendError(w http.ResponseWriter, status int, err error) {
	sendJSON(w, status, Response{Success: false, Error: err.Error()})
}
