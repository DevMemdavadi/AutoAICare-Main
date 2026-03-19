import { Button, Card, Input, Textarea } from "@/components/ui";
import { Calendar, MapPin } from "lucide-react";




const BookingAdditionalDetails = ({
    pickupRequired,
    setPickupRequired,
    pickupData,
    setPickupData,
    notes,
    setNotes
}) => {
    return (
        <div className="space-y-6">
            {/* Pickup & Drop Section */}
            <Card title="Pickup & Drop">
                <div>
                    <h3 className="font-medium text-gray-900 mb-3">
                        Is Pickup Required?
                    </h3>
                    <div className="flex gap-4">
                        <Button
                            variant={pickupRequired ? "default" : "outline"}
                            onClick={() => setPickupRequired(true)}
                        >
                            Yes
                        </Button>
                        <Button
                            variant={!pickupRequired ? "default" : "outline"}
                            onClick={() => setPickupRequired(false)}
                        >
                            No
                        </Button>
                    </div>

                    {pickupRequired && (
                        <div className="mt-4 space-y-4">
                            <Input
                                label="Pickup Address"
                                placeholder="Enter pickup address"
                                value={pickupData.location}
                                onChange={(e) =>
                                    setPickupData({ ...pickupData, location: e.target.value })
                                }
                                required
                            />
                            <Input
                                label="Pickup Time"
                                type="datetime-local"
                                value={pickupData.pickup_time}
                                onChange={(e) =>
                                    setPickupData({
                                        ...pickupData,
                                        pickup_time: e.target.value,
                                    })
                                }
                                required
                                prefix={<Calendar className="text-gray-400" size={18} />}
                            />
                        </div>
                    )}
                </div>
            </Card>

            {/* Notes Section */}
            <Card title="Notes">
                <div className="space-y-4">
                    <Textarea
                        label="Internal Notes (Not visible to customer)"
                        placeholder="Add any internal notes for staff..."
                        value={notes.internal}
                        onChange={(e) =>
                            setNotes({ ...notes, internal: e.target.value })
                        }
                        rows={3}
                    />

                    <Textarea
                        label="Customer Notes (Visible to customer)"
                        placeholder="Add any notes for the customer..."
                        value={notes.customer}
                        onChange={(e) =>
                            setNotes({ ...notes, customer: e.target.value })
                        }
                        rows={3}
                    />
                </div>
            </Card>
        </div>
    );
};

export default BookingAdditionalDetails;
