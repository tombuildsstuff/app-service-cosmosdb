# Build and publish the container image with Podman.
#
# Multi-arch (amd64 + arm64) images are built into a single manifest list
# and pushed to the registry under both the v1 and latest tags.
#
# Override any of these on the command line, e.g.:
#   make publish IMAGE=docker.io/you/app-service-cosmosdb

IMAGE       ?= docker.io/tombuildsstuff/app-service-cosmosdb
PLATFORMS   ?= linux/amd64,linux/arm64
VERSION_TAG ?= v1
LATEST_TAG  ?= latest

.PHONY: help build push publish login clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: ## Build the multi-arch image into a local manifest list
	-podman manifest rm $(IMAGE):$(VERSION_TAG)
	podman build --platform $(PLATFORMS) --manifest $(IMAGE):$(VERSION_TAG) .

push: ## Push the manifest list to the registry as v1 and latest
	podman manifest push --all $(IMAGE):$(VERSION_TAG) docker://$(IMAGE):$(VERSION_TAG)
	podman manifest push --all $(IMAGE):$(VERSION_TAG) docker://$(IMAGE):$(LATEST_TAG)

publish: build push ## Build and push (v1 + latest, both arches)

login: ## Log in to the registry (docker.io by default)
	podman login $(firstword $(subst /, ,$(IMAGE)))

clean: ## Remove the local manifest list
	-podman manifest rm $(IMAGE):$(VERSION_TAG)
