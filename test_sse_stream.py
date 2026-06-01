"""
测试 SSE 流式接口
"""
import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000/api/v1"


async def test_sse_stream(conversation_id: str, content: str):
    """测试 SSE 流式接口"""
    url = f"{BASE_URL}/conversations/{conversation_id}/stream"
    params = {"content": content}
    
    print("Testing SSE stream...")
    print(f"   URL: {url}")
    print(f"   Content: {content}")
    print("\nResponse:\n")
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(connect=10.0, read=None, write=30.0, pool=5.0)) as client:
            async with client.stream("GET", url, params=params) as resp:
                resp.raise_for_status()
                
                event_count = 0
                content_delta_count = 0
                full_content = []
                
                async for line in resp.aiter_lines():
                    if line.startswith("event: "):
                        event_type = line[7:].strip()
                        event_count += 1
                        print(f"  Event: {event_type}")
                    
                    elif line.startswith("data: "):
                        data_str = line[6:].strip()
                        try:
                            data = json.loads(data_str)
                            
                            if 'delta' in data:
                                delta = data['delta']
                                full_content.append(delta)
                                content_delta_count += 1
                                
                                # 每 10 个 delta 打印一次
                                if content_delta_count % 10 == 0:
                                    print(f"   ... received {content_delta_count} chunks")
                            
                            elif 'conversation_id' in data:
                                print(f"   conversation_id: {data['conversation_id']}")
                            
                            elif 'message' in data:
                                print(f"   ERROR: {data['message']}")
                        
                        except json.JSONDecodeError:
                            print(f"   JSON parse error: {data_str[:50]}")
                    
                    elif line == "":
                        # 空行表示事件结束
                        pass
                
                print("\nSSE stream completed")
                print(f"   Total events: {event_count}")
                print(f"   Content chunks: {content_delta_count}")
                print(f"   Full content length: {len(''.join(full_content))} chars")
                if full_content:
                    print(f"   First 100 chars: {''.join(full_content)[:100]}")
    
    except httpx.ConnectError:
        print("❌ 无法连接到后端服务，请确保后端运行在 http://localhost:8000")
    
    except httpx.HTTPStatusError as e:
        print(f"❌ HTTP 错误: {e.response.status_code}")
        print(f"   响应: {e.response.text[:200]}")
    
    except Exception as e:
        print(f"Error: {type(e).__name__}: {e}")


async def main():
    # 需要先创建一个对话
    print("1. Creating test conversation...")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BASE_URL}/conversations",
                json={"title": "SSE Test"}
            )
            resp.raise_for_status()
            conversation = resp.json()
            conversation_id = conversation['id']
            print(f"   Created: {conversation_id}\n")
    
    except Exception as e:
        print(f"   Error: {e}")
        print("Make sure backend is running on http://localhost:8000")
        return
    
    # 测试 SSE 流式接口
    await test_sse_stream(
        conversation_id=conversation_id,
        content="Briefly introduce patent writing tips"
    )


if __name__ == "__main__":
    asyncio.run(main())
