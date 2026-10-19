with open('workflows/.env', 'r', encoding='utf-8') as f:
    for line in f:
        if any(line.startswith(p) for p in ['POSTGRES_HOST=', 'POSTGRES_USER=', 'POSTGRES_DATABASE=', 'POSTGRES_PASSWORD=']):
            k, v = line.strip().split('=', 1)
            v = v.strip('\"\'')
            if k == 'POSTGRES_PASSWORD':
                print(f"{k}: len={len(v)}, first_char={v[0] if v else ''}")
            else:
                print(f"{k}: {v}")
