package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"net/http"

	"github.com/improbable-eng/grpc-web/go/grpcweb"
	"github.com/rs/cors"

	"vstable-engine/internal/ast"
	"vstable-engine/internal/db"
	"vstable-engine/internal/mapper"
	"vstable-engine/internal/pb"
)

type engineServer struct {
	pb.UnimplementedEngineServiceServer
	dbManager *db.Manager
}

func (s *engineServer) Ping(ctx context.Context, req *pb.PingRequest) (*pb.PingResponse, error) {
	return &pb.PingResponse{Status: "ok"}, nil
}

func (s *engineServer) DbConnect(ctx context.Context, req *pb.ConnectRequest) (*pb.ConnectResponse, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	if err := s.dbManager.Connect(ctx, req.Id, req.Dialect, req.Dsn); err != nil {
		return nil, status.Errorf(codes.Internal, "connect failed: %v", err)
	}
	return &pb.ConnectResponse{Success: true}, nil
}

func (s *engineServer) Disconnect(ctx context.Context, req *pb.DisconnectRequest) (*pb.DisconnectResponse, error) {
	if err := s.dbManager.Disconnect(req.Id); err != nil {
		return nil, status.Errorf(codes.Internal, "disconnect failed: %v", err)
	}
	return &pb.DisconnectResponse{Success: true}, nil
}

func (s *engineServer) Query(ctx context.Context, req *pb.QueryRequest) (*pb.QueryResponse, error) {
	driver, err := s.dbManager.Get(req.Id)
	if err != nil {
		return nil, status.Errorf(codes.NotFound, "session not found: %v", err)
	}

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	var params []interface{}
	if req.Params != nil {
		for _, v := range req.Params.Values {
			params = append(params, v.AsInterface())
		}
	}

	result, err := driver.Query(ctx, req.Sql, params)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "query error: %v", err)
	}

	fields := make([]*pb.FieldInfo, len(result.Fields))
	for i, f := range result.Fields {
		fields[i] = &pb.FieldInfo{
			Name: f.Name,
			Type: f.Type,
		}
	}

	rows := mapper.RowsToStructs(result.Rows)

	return &pb.QueryResponse{
		Success: true,
		Rows:    rows,
		Fields:  fields,
	}, nil
}

func (s *engineServer) GenerateAlterTable(ctx context.Context, req *pb.DiffRequest) (*pb.GenerateSQLResponse, error) {
	astReq := mapper.ToASTDiffRequest(req)

	compiler, err := ast.GetCompiler(req.Dialect)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "get compiler failed: %v", err)
	}

	sqls := compiler.GenerateAlterTableSql(astReq)
	return &pb.GenerateSQLResponse{
		Success: true,
		Sqls:    sqls,
	}, nil
}

func (s *engineServer) GenerateCreateTable(ctx context.Context, req *pb.DiffRequest) (*pb.GenerateSQLResponse, error) {
	astReq := mapper.ToASTDiffRequest(req)

	compiler, err := ast.GetCompiler(req.Dialect)
	if err != nil {
		return nil, status.Errorf(codes.InvalidArgument, "get compiler failed: %v", err)
	}

	sqls := compiler.GenerateCreateTableSql(astReq)
	return &pb.GenerateSQLResponse{
		Success: true,
		Sqls:    sqls,
	}, nil
}

// UnaryInterceptor handles panics and generic errors
func UnaryInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (resp interface{}, err error) {
	defer func() {
		if r := recover(); r != nil {
			err = status.Errorf(codes.Internal, "panic: %v", r)
		}
	}()

	traceID := "unknown"
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if vals := md.Get("x-trace-id"); len(vals) > 0 {
			traceID = vals[0]
		}
	}

	log.Printf("[%s] gRPC Request: %s | payload: %+v", traceID, info.FullMethod, req)

	resp, err = handler(ctx, req)
	if err != nil {
		// Just ensure it's a grpc status error
		if _, ok := status.FromError(err); !ok {
			err = status.Errorf(codes.Unknown, "%v", err)
		}
		log.Printf("[%s] gRPC Response: %s | error: %v", traceID, info.FullMethod, err)
	} else {
		log.Printf("[%s] gRPC Response: %s | success", traceID, info.FullMethod)
	}
	return resp, err
}

func main() {
	port := os.Getenv("VSTABLE_PORT")
	if port == "" {
		port = "39082"
	}

	// 50MB is generous for large schemas and query results
	maxMsgSize := 1024 * 1024 * 50
	
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer(
		grpc.UnaryInterceptor(UnaryInterceptor),
		grpc.MaxRecvMsgSize(maxMsgSize),
		grpc.MaxSendMsgSize(maxMsgSize),
	)

	dbManager := db.NewManager()
	pb.RegisterEngineServiceServer(grpcServer, &engineServer{dbManager: dbManager})

	wrappedGrpc := grpcweb.WrapServer(grpcServer,
		grpcweb.WithOriginFunc(func(origin string) bool { return true }),
	)

	handler := func(res http.ResponseWriter, req *http.Request) {
		if wrappedGrpc.IsGrpcWebRequest(req) || wrappedGrpc.IsAcceptableGrpcCorsRequest(req) {
			wrappedGrpc.ServeHTTP(res, req)
			return
		}
		http.DefaultServeMux.ServeHTTP(res, req)
	}

	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Accept-Encoding", "Accept-Language", "Content-Length", "Content-Type", "x-grpc-web", "x-user-agent", "x-trace-id"},
		AllowCredentials: false,
	}).Handler(http.HandlerFunc(handler))

	fmt.Printf("gRPC-Web Engine listening on :%s...\n", port)
	
	httpServer := &http.Server{
		Handler: corsHandler,
	}

	if err := httpServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
