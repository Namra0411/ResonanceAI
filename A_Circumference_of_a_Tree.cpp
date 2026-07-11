// Online C++ compiler to run C++ program online
#include <bits/stdc++.h>
using namespace std;
using ll = long long ;
pair<int,int> bfs(int node,int n,vector<vector<int>>&adj){
    //return the node which is the farthest !
    vector<int>dist(n+1);
    vector<int>vis(n+1,0);
    vis[node]=1;
    queue<int>q;
    q.push(node);
    dist[node]=0;
    int maxNode=node;
    int maxi=0;
    while(!q.empty()){
        int sz=q.size();
        while(sz--){
            int curr=q.front();q.pop();
            
            for(auto it:adj[curr]){
                if(!vis[it]){
                    vis[it]=1;
                    q.push(it);
                    dist[it]=dist[curr]+1;
                    if(maxi<dist[it]){
                        maxNode=it;
                        maxi=dist[it];
                    }
                }
            }
        }
    }
    return {maxNode,maxi};
}
int main() {
    // Write C++ code here
    int n ;
    cin>>n;
    vector<vector<int>>adj(n+1);
    for(int i=0;i<n-1;i++){
        int a,b;
        cin>>a>>b;
        adj[a].push_back(b);
        adj[b].push_back(a);
    }
    //start from anu node the longest is the one end!\
    //same for it then the next is other end 
    int oneEnd=bfs(1,n,adj).first;
    auto  ans=bfs(oneEnd,n,adj);
    cout<<3*ans.second<<endl;
    
    return 0;
}