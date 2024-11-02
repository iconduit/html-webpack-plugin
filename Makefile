-include .makefiles/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-npm.mk

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"

################################################################################

.PHONY: test
test:: integrate

.PHONY: precommit
precommit:: integrate

.PHONY: ci
ci:: integrate

.PHONY: integrate
integrate: artifacts/link-dependencies.touch
	@rm -rf test/integration/simple/dist
	$(JS_EXEC) webpack --config test/integration/simple/webpack.config.js
	jq -e . test/integration/simple/dist/app.webmanifest
