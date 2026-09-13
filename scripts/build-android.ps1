param([string]$SdkPath = $env:ANDROID_HOME, [string]$NdkPath = $env:NDK_HOME)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$frontendRoot = Join-Path $projectRoot 'frontend'
if (-not $SdkPath -or -not (Test-Path -LiteralPath $SdkPath)) {
    throw 'Set ANDROID_HOME or pass -SdkPath with the installed Android SDK directory.'
}
if (-not $NdkPath) {
    $ndkDirectory = Get-ChildItem -LiteralPath (Join-Path $SdkPath 'ndk') -Directory | Sort-Object Name | Select-Object -Last 1
    $NdkPath = $ndkDirectory.FullName
}
if (-not $NdkPath -or -not (Test-Path -LiteralPath $NdkPath)) { throw 'Android NDK is missing.' }
$env:ANDROID_HOME = $SdkPath
$env:NDK_HOME = $NdkPath
if (-not $env:GRADLE_USER_HOME) { $env:GRADLE_USER_HOME = Join-Path $frontendRoot '.gradle-cache' }

Push-Location $frontendRoot
try {
    $logPath = Join-Path $frontendRoot 'android-build.log'
    # Windows PowerShell 5 treats redirected native stderr as ErrorRecords,
    # including Tauri's informational messages. The native exit code is the gate.
    $ErrorActionPreference = 'Continue'
    & npx.cmd tauri android build --debug --target aarch64 --apk *> $logPath
    $buildExit = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $buildLog = Get-Content -LiteralPath $logPath -Raw
    $buildLog = [regex]::Replace($buildLog, ([char]27 + '\[[0-9;]*m'), '')
    if ($buildExit -ne 0) {
        # Tauri has compiled the current Rust library before reaching its symlink step.
        # On Windows without Developer Mode, copy that library and run the same Gradle
        # packaging task. Do not accept unrelated build errors or reuse a stale binary.
        if ($buildLog -notmatch 'Creation symbolic link is not allowed' -or $buildLog -notmatch 'Finished `dev` profile') {
            throw "Android native build failed. See $logPath"
        }
        $library = Join-Path $frontendRoot 'src-tauri/target/aarch64-linux-android/debug/libapp_lib.so'
        if (-not (Test-Path -LiteralPath $library)) { throw 'Compiled Android library is missing.' }
        $androidRoot = Join-Path $frontendRoot 'src-tauri/gen/android'
        $jniRoot = Join-Path $androidRoot 'app/src/main/jniLibs/arm64-v8a'
        New-Item -ItemType Directory -Path $jniRoot -Force | Out-Null
        $packagedLibrary = Join-Path $jniRoot 'libapp_lib.so'
        Copy-Item -LiteralPath $library -Destination $packagedLibrary -Force
        $stripTool = Join-Path $NdkPath 'toolchains/llvm/prebuilt/windows-x86_64/bin/llvm-strip.exe'
        & $stripTool --strip-debug $packagedLibrary
        if ($LASTEXITCODE -ne 0) { throw 'Failed to strip Android packaging copy.' }
        Write-Host 'Native library compiled; packaging a copied library without Windows symlinks.'
        Push-Location $androidRoot
        try {
            $ErrorActionPreference = 'Continue'
            & .\gradlew.bat --no-daemon assembleArm64Debug -x rustBuildArm64Debug *> (Join-Path $frontendRoot 'android-package.log')
            $packageExit = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            if ($packageExit -ne 0) { throw 'Android packaging failed. See frontend/android-package.log' }
        } finally { Pop-Location }
    }
    $apk = Join-Path $frontendRoot 'src-tauri/gen/android/app/build/outputs/apk/arm64/debug/app-arm64-debug.apk'
    if (-not (Test-Path -LiteralPath $apk)) { throw 'Expected Android APK was not generated.' }
    Write-Host "Android APK: $apk"
} finally { Pop-Location }
