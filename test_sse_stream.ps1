# 测试 SSE 流式接口
$conversationId = "d18c4312-c942-4a61-9b7d-ce3342fe7cdd"
$content = "test"
$url = "http://localhost:8000/api/v1/conversations/$conversationId/stream?content=$content"

Write-Host "Testing SSE stream..." -ForegroundColor Cyan
Write-Host "  URL: $url" -ForegroundColor Gray
Write-Host ""

try {
    # 使用 .NET 的 HttpClient 来禁用缓冲
    Add-Type -AssemblyName System.Net.Http
    
    $httpClient = New-Object System.Net.Http.HttpClient
    $httpClient.Timeout = [TimeSpan]::FromSeconds(30)
    
    $response = $httpClient.GetAsync($url, [System.Net.Http.HttpCompletionOption]::ResponseHeadersRead).Result
    $response.EnsureSuccessStatusCode()
    
    $stream = $response.Content.ReadAsStreamAsync().Result
    $reader = New-Object System.IO.StreamReader($stream)
    
    Write-Host "Response received. Reading SSE stream..." -ForegroundColor Green
    Write-Host ""
    
    $eventCount = 0
    $deltaCount = 0
    $fullContent = ""
    
    while (-not $reader.EndOfStream) {
        $line = $reader.ReadLine()
        
        if ($line -match "^event: (.+)$") {
            $eventType = $matches[1]
            $eventCount++
            Write-Host "  Event: $eventType" -ForegroundColor Yellow
        }
        elseif ($line -match "^data: (.+)$") {
            $dataStr = $matches[1]
            
            try {
                $data = $dataStr | ConvertFrom-Json
                
                if ($data.delta) {
                    $deltaCount++
                    $fullContent += $data.delta
                    
                    if ($deltaCount % 10 -eq 0) {
                        Write-Host "    ... received $deltaCount chunks" -ForegroundColor Gray
                    }
                }
                elseif ($data.conversation_id) {
                    Write-Host "    conversation_id: $($data.conversation_id)" -ForegroundColor Cyan
                }
                elseif ($data.message) {
                    Write-Host "    ERROR: $($data.message)" -ForegroundColor Red
                }
            }
            catch {
                Write-Host "    JSON parse error: $dataStr" -ForegroundColor DarkYellow
            }
        }
        elseif ($line -eq "") {
            # 空行 = 事件结束
        }
    }
    
    Write-Host ""
    Write-Host "SSE stream completed" -ForegroundColor Green
    Write-Host "  Total events: $eventCount" -ForegroundColor Gray
    Write-Host "  Content chunks: $deltaCount" -ForegroundColor Gray
    Write-Host "  Full content length: $($fullContent.Length) chars" -ForegroundColor Gray
    if ($fullContent.Length -gt 0) {
        $preview = if ($fullContent.Length -gt 100) { $fullContent.Substring(0, 100) } else { $fullContent }
        Write-Host "  First 100 chars: $preview" -ForegroundColor DarkCyan
    }
    
    $reader.Close()
    $stream.Close()
    $httpClient.Dispose()
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor DarkRed
}
