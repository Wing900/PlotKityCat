package version

import "strings"

var appVersion = "0.0.5.9"

func Current() string {
	value := strings.TrimSpace(appVersion)
	if value == "" {
		return "0.0.5.9"
	}

	return value
}
