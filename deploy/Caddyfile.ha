# 가드레일 2노드 앞단. 호스트의 SSL Manager Caddy 가 443 → 8088 로 넘기므로
# 여기서는 TLS 를 다루지 않는다 (DEPLOY.md 참고).
:8088 {
	reverse_proxy guardrail-a:8088 guardrail-b:8088 {
		lb_policy least_conn
		# 죽은 노드로 보내지 않는다. 검사 없이 통과하는 것보다 느린 편이 낫다.
		health_uri /healthz
		health_interval 10s
		health_timeout 3s
		fail_duration 30s
	}
	encode gzip
}
