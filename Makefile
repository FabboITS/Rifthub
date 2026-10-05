up:
	docker compose up --build -d

down:
	docker compose down

logs:
	docker compose logs -f backend

seed:
	docker compose exec backend python manage.py seed_demo

test:
	docker compose exec backend pytest -q
	cd frontend && npm test

.PHONY: up down logs seed test
