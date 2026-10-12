package version

import "strings"

var appVersion = "0.0.5.4"

func Current() string {
	value := strings.TrimSpace(appVersion)
	if value == "" {
		return "0.0.5.4"
	}

	return value
}
