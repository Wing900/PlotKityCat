package updater

import "plotkitycat/internal/releaseauth"

type Manifest = releaseauth.Manifest
type ReleaseArtifact = releaseauth.Artifact

type State struct {
	LastCheckedAt       string    `json:"lastCheckedAt"`
	LatestVersion       string    `json:"latestVersion"`
	LatestNotes         string    `json:"latestNotes"`
	LatestPublishedAt   string    `json:"latestPublishedAt"`
	DownloadedVersion   string    `json:"downloadedVersion"`
	DownloadedPath      string    `json:"downloadedPath"`
	DownloadedSHA256    string    `json:"downloadedSha256"`
	DownloadedManifest  *Manifest `json:"downloadedManifest,omitempty"`
	LastKnownArtifact   string    `json:"lastKnownArtifact"`
	LastKnownMessage    string    `json:"lastKnownMessage"`
	LastKnownAvailable  bool      `json:"lastKnownAvailable"`
	LastKnownDownloaded bool      `json:"lastKnownDownloaded"`
}

type Status struct {
	CurrentVersion  string `json:"currentVersion"`
	LatestVersion   string `json:"latestVersion"`
	Notes           string `json:"notes"`
	PublishedAt     string `json:"publishedAt"`
	LastCheckedAt   string `json:"lastCheckedAt"`
	Message         string `json:"message"`
	UpdateAvailable bool   `json:"updateAvailable"`
	Downloaded      bool   `json:"downloaded"`
	ReadyToInstall  bool   `json:"readyToInstall"`
}
