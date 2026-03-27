package database

import (
	"fmt"

	"gorm.io/driver/mysql"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func Open(driverName string, dsn string) (*gorm.DB, error) {
	switch driverName {
	case "mysql":
		if dsn == "" {
			return nil, fmt.Errorf("database dsn is required for mysql")
		}
		return gorm.Open(mysql.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	case "sqlite":
		if dsn == "" {
			dsn = "file::memory:?cache=shared"
		}
		return gorm.Open(sqlite.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	default:
		return nil, fmt.Errorf("unsupported database driver: %s", driverName)
	}
}
