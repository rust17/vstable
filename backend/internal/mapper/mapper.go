package mapper

import (
	"fmt"
	"log"
	"math"
	"math/big"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"google.golang.org/protobuf/types/known/structpb"

	"vstable-engine/internal/ast"
	"vstable-engine/internal/pb"
)

func ToASTDiffRequest(req *pb.DiffRequest) ast.DiffRequest {
	if req == nil {
		return ast.DiffRequest{}
	}

	res := ast.DiffRequest{
		Dialect:        req.Dialect,
		Schema:         req.Schema,
		TableName:      req.TableName,
		OldTableName:   req.OldTableName,
		Columns:        mapColumns(req.Columns),
		Indexes:        mapIndexes(req.Indexes),
		DeletedColumns: mapColumns(req.DeletedColumns),
		DeletedIndexes: mapIndexes(req.DeletedIndexes),

		ForeignKeys:        mapForeignKeys(req.ForeignKeys),
		DeletedForeignKeys: mapForeignKeys(req.DeletedForeignKeys),
		CheckConstraints:   mapCheckConstraints(req.CheckConstraints),
		DeletedChecks:      mapCheckConstraints(req.DeletedChecks),

		Views:        mapViews(req.Views),
		DeletedViews: mapViews(req.DeletedViews),

		Triggers:        mapTriggers(req.Triggers),
		DeletedTriggers: mapTriggers(req.DeletedTriggers),

		Routines:        mapRoutines(req.Routines),
		DeletedRoutines: mapRoutines(req.DeletedRoutines),
	}

	if req.Config != nil {
		res.Config = &ast.DatabaseConfig{
			Charset:             req.Config.Charset,
			Collation:           req.Config.Collation,
			Engine:              req.Config.Engine,
			AutoIncrementOffset: int(req.Config.AutoIncrementOffset),
		}
	}

	return res
}

func mapColumns(cols []*pb.ColumnDefinition) []ast.ColumnDefinition {
	if cols == nil {
		return nil
	}
	res := make([]ast.ColumnDefinition, len(cols))
	for i, c := range cols {
		res[i] = mapColumn(c)
	}
	return res
}

func mapColumn(c *pb.ColumnDefinition) ast.ColumnDefinition {
	if c == nil {
		return ast.ColumnDefinition{}
	}

	var original *ast.ColumnDefinition
	if c.Original != nil {
		orig := mapColumn(c.Original)
		original = &orig
	}

	return ast.ColumnDefinition{
		ID:                  c.Id,
		Name:                c.Name,
		Type:                c.Type,
		EnumValues:          c.EnumValues,
		Length:              fromInt64Ptr(c.Length),
		Precision:           fromInt64Ptr(c.Precision),
		Scale:               fromInt64Ptr(c.Scale),
		Nullable:            c.Nullable,
		DefaultValue:        c.DefaultValue,
		IsDefaultExpression: c.IsDefaultExpression,
		IsPrimaryKey:        c.IsPrimaryKey,
		IsAutoIncrement:     c.IsAutoIncrement,
		IsIdentity:          c.IsIdentity,
		Comment:             c.Comment,
		PkConstraintName:    c.PkConstraintName,
		OriginalIndex:       int(c.OriginalIndex),
		Original:            original,
	}
}

func fromInt64Ptr(v *int64) interface{} {
	if v == nil {
		return nil
	}
	return *v
}

func mapIndexes(idxs []*pb.IndexDefinition) []ast.IndexDefinition {
	if idxs == nil {
		return nil
	}
	res := make([]ast.IndexDefinition, len(idxs))
	for i, idx := range idxs {
		res[i] = mapIndex(idx)
	}
	return res
}

func mapIndex(idx *pb.IndexDefinition) ast.IndexDefinition {
	if idx == nil {
		return ast.IndexDefinition{}
	}
	var original *ast.IndexDefinition
	if idx.Original != nil {
		orig := mapIndex(idx.Original)
		original = &orig
	}
	return ast.IndexDefinition{
		ID:       idx.Id,
		Name:     idx.Name,
		Columns:  idx.Columns,
		IsUnique: idx.IsUnique,
		Original: original,
	}
}

func mapForeignKeys(fks []*pb.ForeignKeyDefinition) []ast.ForeignKeyDefinition {
	if fks == nil {
		return nil
	}
	res := make([]ast.ForeignKeyDefinition, len(fks))
	for i, fk := range fks {
		res[i] = mapForeignKey(fk)
	}
	return res
}

func mapForeignKey(fk *pb.ForeignKeyDefinition) ast.ForeignKeyDefinition {
	if fk == nil {
		return ast.ForeignKeyDefinition{}
	}
	var original *ast.ForeignKeyDefinition
	if fk.Original != nil {
		orig := mapForeignKey(fk.Original)
		original = &orig
	}
	return ast.ForeignKeyDefinition{
		ID:                fk.Id,
		Name:              fk.Name,
		Columns:           fk.Columns,
		ReferencedTable:   fk.ReferencedTable,
		ReferencedColumns: fk.ReferencedColumns,
		OnDelete:          fk.OnDelete,
		OnUpdate:          fk.OnUpdate,
		Original:          original,
	}
}

func mapCheckConstraints(checks []*pb.CheckConstraintDefinition) []ast.CheckConstraintDefinition {
	if checks == nil {
		return nil
	}
	res := make([]ast.CheckConstraintDefinition, len(checks))
	for i, c := range checks {
		res[i] = mapCheckConstraint(c)
	}
	return res
}

func mapCheckConstraint(c *pb.CheckConstraintDefinition) ast.CheckConstraintDefinition {
	if c == nil {
		return ast.CheckConstraintDefinition{}
	}
	var original *ast.CheckConstraintDefinition
	if c.Original != nil {
		orig := mapCheckConstraint(c.Original)
		original = &orig
	}
	return ast.CheckConstraintDefinition{
		ID:         c.Id,
		Name:       c.Name,
		Expression: c.Expression,
		Original:   original,
	}
}

func mapViews(views []*pb.ViewDefinition) []ast.ViewDefinition {
	if views == nil {
		return nil
	}
	res := make([]ast.ViewDefinition, len(views))
	for i, v := range views {
		res[i] = mapView(v)
	}
	return res
}

func mapView(v *pb.ViewDefinition) ast.ViewDefinition {
	if v == nil {
		return ast.ViewDefinition{}
	}
	var original *ast.ViewDefinition
	if v.Original != nil {
		orig := mapView(v.Original)
		original = &orig
	}
	return ast.ViewDefinition{
		ID:         v.Id,
		Name:       v.Name,
		Definition: v.Definition,
		Original:   original,
	}
}

func mapTriggers(triggers []*pb.TriggerDefinition) []ast.TriggerDefinition {
	if triggers == nil {
		return nil
	}
	res := make([]ast.TriggerDefinition, len(triggers))
	for i, t := range triggers {
		res[i] = mapTrigger(t)
	}
	return res
}

func mapTrigger(t *pb.TriggerDefinition) ast.TriggerDefinition {
	if t == nil {
		return ast.TriggerDefinition{}
	}
	var original *ast.TriggerDefinition
	if t.Original != nil {
		orig := mapTrigger(t.Original)
		original = &orig
	}
	return ast.TriggerDefinition{
		ID:         t.Id,
		Name:       t.Name,
		Timing:     t.Timing,
		Event:      t.Event,
		TableName:  t.TableName,
		Definition: t.Definition,
		Enabled:    t.Enabled,
		Original:   original,
	}
}

func mapRoutines(routines []*pb.RoutineDefinition) []ast.RoutineDefinition {
	if routines == nil {
		return nil
	}
	res := make([]ast.RoutineDefinition, len(routines))
	for i, r := range routines {
		res[i] = mapRoutine(r)
	}
	return res
}

func mapRoutine(r *pb.RoutineDefinition) ast.RoutineDefinition {
	if r == nil {
		return ast.RoutineDefinition{}
	}
	var original *ast.RoutineDefinition
	if r.Original != nil {
		orig := mapRoutine(r.Original)
		original = &orig
	}
	return ast.RoutineDefinition{
		ID:         r.Id,
		Name:       r.Name,
		Type:       r.Type,
		Definition: r.Definition,
		Original:   original,
	}
}

func toSafeValue(v interface{}) interface{} {
	if v == nil {
		return nil
	}

	switch val := v.(type) {
	case int:
		return float64(val)
	case int32:
		return float64(val)
	case int64:
		return float64(val)
	case uint32:
		return float64(val)
	case uint64:
		return float64(val)
	case float32:
		return float64(val)
	case float64:
		return val
	case *big.Int:
		f, _ := new(big.Float).SetInt(val).Float64()
		return f
	case pgtype.Numeric:
		if val.Valid {
			f, _ := new(big.Float).SetInt(val.Int).Float64()
			if val.Exp != 0 {
				f *= math.Pow10(int(val.Exp))
			}
			return f
		} else {
			return nil
		}
	case pgtype.UUID:
		if val.Valid {
			return fmt.Sprintf("%x-%x-%x-%x-%x", val.Bytes[0:4], val.Bytes[4:6], val.Bytes[6:8], val.Bytes[8:10], val.Bytes[10:16])
		}
		return nil
	case [16]byte:
		return fmt.Sprintf("%x-%x-%x-%x-%x", val[0:4], val[4:6], val[6:8], val[8:10], val[10:16])
	case time.Time:
		return val.Format(time.RFC3339Nano)
	case []byte:
		return string(val)
	case bool:
		return val
	case string:
		return val
	case map[string]interface{}:
		newMap := make(map[string]interface{})
		for k, v := range val {
			newMap[k] = toSafeValue(v)
		}
		return newMap
	case []interface{}:
		newSlice := make([]interface{}, len(val))
		for i, v := range val {
			newSlice[i] = toSafeValue(v)
		}
		return newSlice
	default:
		return fmt.Sprintf("%v", val)
	}
}

func RowsToStructs(rows []map[string]interface{}) []*structpb.Struct {
	res := make([]*structpb.Struct, 0, len(rows))
	for _, r := range rows {
		safeMap := make(map[string]interface{})
		for k, v := range r {
			safeMap[k] = toSafeValue(v)
		}
		st, err := structpb.NewStruct(safeMap)
		if err == nil {
			res = append(res, st)
		} else {
			log.Printf("Failed to convert row to struct: %v, safeMap: %v", err, safeMap)
		}
	}
	return res
}
