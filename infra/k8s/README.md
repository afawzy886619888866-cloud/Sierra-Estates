# Sierra Estates — Kubernetes Production Deployment

This directory contains cloud-agnostic production Kubernetes manifests for Sierra Estates, generated according to strict `/k8s-manifest-generator` standards.

## Architecture

- **Namespace**: `sierra-estates`
- **Deployment**: `sierra-estates-realty` (2-10 replicas, zero-downtime rolling update)
- **Service**: `sierra-estates-realty-svc` (ClusterIP, port 80 -> 3000)
- **Ingress**: NGINX Ingress with automatic Let's Encrypt TLS via cert-manager
- **Autoscaling**: Horizontal Pod Autoscaler (HPA) targeting 75% CPU and 80% RAM
- **Availability**: PodDisruptionBudget ensuring minimum 1 replica available during node maintenance

## Manifest Index

| File | Kind | Purpose |
|---|---|---|
| `namespace.yaml` | Namespace | Dedicated workspace boundary |
| `configmap.yaml` | ConfigMap | Environment configurations |
| `secret.yaml` | Secret | Production secrets template |
| `deployment.yaml` | Deployment | App pod spec with health probes & non-root user |
| `service.yaml` | Service | Internal load balancer |
| `ingress.yaml` | Ingress | External routing with SSL termination |
| `hpa.yaml` | HorizontalPodAutoscaler | Elastic scale from 2 to 10 pods |
| `pdb.yaml` | PodDisruptionBudget | High availability during cluster maintenance |
| `kustomization.yaml` | Kustomization | Root manifest bundle |

## Deployment Instructions

```bash
# Apply with Kustomize
kubectl apply -k infra/k8s/

# Monitor rollout status
kubectl rollout status deployment/sierra-estates-realty -n sierra-estates

# Inspect running pods
kubectl get pods -n sierra-estates -l app.kubernetes.io/name=sierra-estates-realty
```
