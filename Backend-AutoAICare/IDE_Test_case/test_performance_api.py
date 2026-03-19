import requests
import json

# Test performance API endpoints
BASE_URL = "http://localhost:8000/api/jobcards/performance"

def test_team_summary():
    """Test team summary endpoint"""
    print("\n" + "="*60)
    print("Testing Team Summary Endpoint")
    print("="*60)
    
    url = f"{BASE_URL}/team-summary/"
    params = {"period": "daily"}
    
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} team summaries")
            if data:
                print("\nSample Team Summary:")
                print(json.dumps(data[0], indent=2))
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

def test_leaderboard():
    """Test leaderboard endpoint"""
    print("\n" + "="*60)
    print("Testing Leaderboard Endpoint")
    print("="*60)
    
    url = f"{BASE_URL}/leaderboard/"
    params = {"period": "daily", "metric": "total_job_value", "limit": 5}
    
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} teams in leaderboard")
            if data:
                print("\nTop 3 Teams:")
                for i, team in enumerate(data[:3], 1):
                    print(f"\n{i}. {team.get('supervisor_name', 'Unknown')}")
                    print(f"   Jobs: {team.get('total_jobs_completed', 0)}")
                    print(f"   Value: ₹{team.get('total_job_value', 0)}")
                    print(f"   Efficiency: {team.get('efficiency_percentage', 0)}%")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

def test_branch_summary():
    """Test branch summary endpoint"""
    print("\n" + "="*60)
    print("Testing Branch Summary Endpoint")
    print("="*60)
    
    url = f"{BASE_URL}/branch-summary/"
    params = {"period": "daily"}
    
    try:
        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Found {len(data)} branch summaries")
            if data:
                print("\nBranch Performance:")
                for branch in data[:3]:
                    print(f"\n- {branch.get('supervisor_name', 'Unknown')}")
                    print(f"  Jobs: {branch.get('total_jobs_completed', 0)}")
                    print(f"  Value: ₹{branch.get('total_job_value', 0)}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

def test_calculate_reward():
    """Test potential reward calculation"""
    print("\n" + "="*60)
    print("Testing Potential Reward Calculation")
    print("="*60)
    
    url = f"{BASE_URL}/calculate-potential-reward/"
    data = {
        "job_value": 12000,
        "time_saved_minutes": 30,
        "branch_id": 1
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✓ Reward calculation successful")
            print(f"\nJob Value: ₹{result.get('job_value', 0)}")
            print(f"Tier: {result.get('tier', 'N/A')}")
            print(f"Base Percentage: {result.get('base_percentage', 0)}%")
            print(f"Base Reward: ₹{result.get('base_reward', 0)}")
            print(f"Time Bonus: ₹{result.get('time_bonus_amount', 0)}")
            print(f"Total Reward: ₹{result.get('total_reward', 0)}")
            print(f"\nNotes: {result.get('calculation_notes', '')}")
        else:
            print(f"✗ Error: {response.text}")
    except Exception as e:
        print(f"✗ Exception: {e}")

if __name__ == "__main__":
    print("\n" + "="*60)
    print("PERFORMANCE API TESTING")
    print("="*60)
    print("Note: Make sure the Django server is running on localhost:8000")
    print("      and you're authenticated (or endpoints allow anonymous access)")
    
    test_team_summary()
    test_leaderboard()
    test_branch_summary()
    test_calculate_reward()
    
    print("\n" + "="*60)
    print("Testing Complete!")
    print("="*60 + "\n")
