package mapper

import (
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestRowsToStructs_ComplexTypes(t *testing.T) {
	uuidBytes := [16]byte{1, 116, 198, 254, 102, 239, 65, 167, 181, 184, 91, 153, 0, 123, 137, 96}
	
	rows := []map[string]interface{}{
		{
			"id":   1,
			"json": map[string]interface{}{"status": "processing"},
			"uuid": pgtype.UUID{Bytes: uuidBytes, Valid: true},
			"raw_uuid": uuidBytes,
			"time": time.Date(2026, 3, 9, 12, 0, 0, 0, time.UTC),
		},
	}

	structs := RowsToStructs(rows)
	if len(structs) != 1 {
		t.Fatalf("expected 1 struct, got %d", len(structs))
	}

	data, _ := json.MarshalIndent(structs[0], "", "  ")
	fmt.Printf("Rendered Result:\n%s\n", string(data))

	// Verify UUID format
	fields := structs[0].GetFields()
	uuidStr := fields["uuid"].GetStringValue()
	expectedUUID := "0174c6fe-66ef-41a7-b5b8-5b99007b8960"
	if uuidStr != expectedUUID {
		t.Errorf("expected UUID %s, got %s", expectedUUID, uuidStr)
	}

	rawUuidStr := fields["raw_uuid"].GetStringValue()
	if rawUuidStr != expectedUUID {
		t.Errorf("expected raw UUID %s, got %s", expectedUUID, rawUuidStr)
	}

	// Verify JSON is a struct (not a string)
	jsonVal := fields["json"].GetStructValue()
	if jsonVal == nil {
		t.Error("expected json field to be a struct, got nil")
	} else if jsonVal.Fields["status"].GetStringValue() != "processing" {
		t.Errorf("expected status processing, got %v", jsonVal.Fields["status"])
	}
}
