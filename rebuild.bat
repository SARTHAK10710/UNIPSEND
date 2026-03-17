@echo off
setlocal enabledelayedexpansion
REM =============================================
REM  Unispend Docker Rebuild Script (Windows)
REM =============================================

set "START_TIME=%TIME%"

REM --- Check Docker ---
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo   [ERROR] Docker is not running. Start Docker Desktop first.
    exit /b 1
)

REM --- Parse Command ---
if "%~1"=="" goto show_help
if "%~1"=="help" goto show_help
if "%~1"=="--help" goto show_help

if "%~1"=="all" goto cmd_all
if "%~1"=="gateway" goto cmd_gateway
if "%~1"=="auth" goto cmd_auth
if "%~1"=="plaid" goto cmd_plaid
if "%~1"=="user" goto cmd_user
if "%~1"=="investment" goto cmd_investment
if "%~1"=="subscription" goto cmd_subscription
if "%~1"=="notification" goto cmd_notification
if "%~1"=="health" goto cmd_health
if "%~1"=="logs" goto cmd_logs
if "%~1"=="stop" goto cmd_stop
if "%~1"=="restart" goto cmd_restart
if "%~1"=="fresh" goto cmd_fresh
if "%~1"=="redis-flush" goto cmd_redis_flush
if "%~1"=="db" goto cmd_db
if "%~1"=="redis" goto cmd_redis

echo.
echo   [ERROR] Unknown command: %~1
echo   Valid services: gateway, auth, plaid, investment, subscription, notification, user
echo   Run: rebuild help
goto done

REM =============================================
REM  COMMANDS
REM =============================================

:cmd_all
echo.
echo   ============================================
echo    Full Rebuild - All Services
echo   ============================================
echo.
echo   [INFO] Stopping all services...
docker compose down --remove-orphans 2>nul
echo   [INFO] Building all services...
docker compose build --no-cache
if %errorlevel% neq 0 (
    echo   [ERROR] Build failed!
    goto done
)
echo   [INFO] Starting all services...
docker compose up -d
echo   [INFO] Waiting 8 seconds for services to start...
timeout /t 8 /nobreak >nul
call :health_check_fn
echo.
call :show_elapsed
goto done

:cmd_gateway
call :rebuild_single gateway gateway 3000
goto done

:cmd_auth
call :rebuild_single auth auth-service 3001
goto done

:cmd_plaid
call :rebuild_single plaid plaid-service 3002
goto done

:cmd_user
call :rebuild_single user user-service 3006
goto done

:cmd_investment
call :rebuild_single investment investment-service 3003
goto done

:cmd_subscription
call :rebuild_single subscription subscription-service 3004
goto done

:cmd_notification
call :rebuild_single notification notification-service 3005
goto done

:cmd_health
call :health_check_fn
goto done

:cmd_logs
if "%~2"=="" (
    echo   [INFO] Following logs for all services... (Ctrl+C to stop)
    docker compose logs -f
) else (
    set "svc="
    if "%~2"=="gateway" set "svc=gateway"
    if "%~2"=="auth" set "svc=auth-service"
    if "%~2"=="plaid" set "svc=plaid-service"
    if "%~2"=="user" set "svc=user-service"
    if "%~2"=="investment" set "svc=investment-service"
    if "%~2"=="subscription" set "svc=subscription-service"
    if "%~2"=="notification" set "svc=notification-service"
    if "!svc!"=="" (
        echo   [ERROR] Unknown service: %~2
        echo   Valid: gateway, auth, plaid, investment, subscription, notification, user
        goto done
    )
    echo   [INFO] Following logs for !svc!... (Ctrl+C to stop)
    docker compose logs -f !svc!
)
goto done

:cmd_stop
echo.
echo   ============================================
echo    Stopping All Services
echo   ============================================
echo.
docker compose down --remove-orphans
echo.
echo   [OK] All services stopped.
call :show_elapsed
goto done

:cmd_restart
echo.
echo   ============================================
echo    Restarting All Services (no rebuild)
echo   ============================================
echo.
echo   [INFO] Stopping services...
docker compose down --remove-orphans 2>nul
echo   [INFO] Starting services...
docker compose up -d
echo   [INFO] Waiting 8 seconds for services to start...
timeout /t 8 /nobreak >nul
call :health_check_fn
echo.
call :show_elapsed
goto done

:cmd_fresh
echo.
echo   ============================================
echo    FRESH REBUILD (Nuclear Option)
echo   ============================================
echo.
echo   [WARNING] This will DELETE all volumes including Postgres data!
echo.
set /p "confirm=  Are you sure? (yes/no): "
if /i not "!confirm!"=="yes" (
    echo   [INFO] Cancelled.
    goto done
)
echo.
echo   [INFO] Stopping everything and removing volumes...
docker compose down --remove-orphans --volumes 2>nul
echo   [INFO] Pruning containers...
docker container prune -f 2>nul
echo   [INFO] Building everything from scratch...
docker compose build --no-cache
echo   [INFO] Starting all services...
docker compose up -d
echo   [INFO] Waiting 10 seconds for fresh initialization...
timeout /t 10 /nobreak >nul
call :health_check_fn
echo.
call :show_elapsed
goto done

:cmd_redis_flush
echo.
echo   ============================================
echo    Flushing Redis Cache
echo   ============================================
echo.
set "REDIS_ID="
for /f "tokens=*" %%i in ('docker compose ps -q redis 2^>nul') do set "REDIS_ID=%%i"
if not defined REDIS_ID (
    echo   [ERROR] Redis container is not running.
    goto done
)
docker exec !REDIS_ID! redis-cli FLUSHALL
echo.
echo   [OK] Redis cache flushed!
goto done

:cmd_db
echo.
echo   [INFO] Opening Postgres shell...
echo.
set "PG_ID="
for /f "tokens=*" %%i in ('docker compose ps -q postgres 2^>nul') do set "PG_ID=%%i"
if not defined PG_ID (
    echo   [ERROR] Postgres container is not running.
    goto done
)
docker exec -it !PG_ID! psql -U postgres unispend
goto done

:cmd_redis
echo.
echo   [INFO] Opening Redis CLI...
echo.
set "REDIS_ID="
for /f "tokens=*" %%i in ('docker compose ps -q redis 2^>nul') do set "REDIS_ID=%%i"
if not defined REDIS_ID (
    echo   [ERROR] Redis container is not running.
    goto done
)
docker exec -it !REDIS_ID! redis-cli
goto done

REM =============================================
REM  FUNCTIONS
REM =============================================

:rebuild_single
REM %1 = short name, %2 = compose service name, %3 = port
echo.
echo   ============================================
echo    Rebuilding %~1 (%~2)
echo   ============================================
echo.
echo   [INFO] Stopping %~2...
docker compose stop %~2 2>nul
docker compose rm -f %~2 2>nul
echo   [INFO] Building %~2...
docker compose build --no-cache %~2
echo   [INFO] Starting %~2...
docker compose up -d %~2
echo   [INFO] Waiting 5 seconds...
timeout /t 5 /nobreak >nul

set "HC_RESULT="
curl -s -o nul -w "%%{http_code}" http://localhost:%~3/health >"%TEMP%\health_status.txt" 2>nul
set /p HC_RESULT=<"%TEMP%\health_status.txt"
del "%TEMP%\health_status.txt" 2>nul

if "!HC_RESULT!"=="200" (
    echo   [OK] %~1 is healthy - http://localhost:%~3
) else (
    echo   [WARN] %~1 returned HTTP !HC_RESULT!
)

echo.
echo   [INFO] Recent logs for %~2:
echo.
docker compose logs --tail=30 %~2
echo.
call :show_elapsed
goto :eof

:health_check_fn
echo.
echo   ============================================
echo    Health Check
echo   ============================================
echo.

set "ALL_OK=1"

call :check_one gateway 3000
call :check_one auth 3001
call :check_one plaid 3002
call :check_one investment 3003
call :check_one subscription 3004
call :check_one notification 3005
call :check_one user 3006

echo.
if "!ALL_OK!"=="1" (
    echo   [OK] All services are healthy!
) else (
    echo   [WARN] Some services are not responding. Run: rebuild logs
)
goto :eof

:check_one
REM %1 = label, %2 = port
set "SVC_STATUS="
curl -s -o nul -w "%%{http_code}" http://localhost:%~2/health >"%TEMP%\hc_%~1.txt" 2>nul
set /p "SVC_STATUS="<"%TEMP%\hc_%~1.txt"
del "%TEMP%\hc_%~1.txt" 2>nul

if "!SVC_STATUS!"=="200" (
    echo   [OK]   %~1	- http://localhost:%~2
) else (
    echo   [FAIL] %~1	- http://localhost:%~2  (HTTP !SVC_STATUS!)
    set "ALL_OK=0"
)
goto :eof

:show_elapsed
echo   [INFO] Started at %START_TIME%, finished at %TIME%
goto :eof

:show_help
echo.
echo   ============================================
echo    UNISPEND
echo    Docker Rebuild and Management
echo   ============================================
echo.
echo   Usage:  rebuild [command] [args]
echo.
echo   Rebuild Commands:
echo     all              Rebuild and restart all services
echo     gateway          Rebuild gateway only
echo     auth             Rebuild auth-service only
echo     plaid            Rebuild plaid-service only
echo     user             Rebuild user-service only
echo     investment       Rebuild investment-service only
echo     subscription     Rebuild subscription-service only
echo     notification     Rebuild notification-service only
echo     fresh            Nuclear rebuild (deletes volumes)
echo.
echo   Management Commands:
echo     health           Check health of all services
echo     logs             Follow logs of all services
echo     logs [service]   Follow logs of specific service
echo     stop             Stop all services
echo     restart          Restart without rebuilding
echo.
echo   Utilities:
echo     redis-flush      Flush Redis cache
echo     db               Open Postgres shell
echo     redis            Open Redis CLI
echo.
echo   Examples:
echo     rebuild all            Full rebuild
echo     rebuild gateway        Rebuild gateway only
echo     rebuild logs auth      Follow auth-service logs
echo     rebuild health         Check all health endpoints
echo.
goto done

:done
endlocal
